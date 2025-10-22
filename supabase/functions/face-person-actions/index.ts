/**
 * Face Person Actions Edge Function
 * 
 * Handles all actions on face_persons:
 * POST /face-person-actions/link-user
 * POST /face-person-actions/invite
 * POST /face-person-actions/merge
 * POST /face-person-actions/ignore
 * POST /face-person-actions/purge
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// Helper Functions
// ============================================

async function verifyEventOrganizer(supabase: any, eventId: string, userId: string): Promise<boolean> {
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single()
  
  return event?.owner_id === userId
}

// ============================================
// Action: Link User
// ============================================

async function linkUser(supabase: any, userId: string, body: any) {
  const { face_person_id, linked_user_id } = body

  if (!face_person_id || !linked_user_id) {
    return { error: 'face_person_id and linked_user_id are required', status: 400 }
  }

  // Get face_person to check event
  const { data: facePerson, error: fetchError } = await supabase
    .from('face_persons')
    .select('event_id')
    .eq('id', face_person_id)
    .single()

  if (fetchError || !facePerson) {
    return { error: 'Face person not found', status: 404 }
  }

  // Verify user is event organizer
  const isOrganizer = await verifyEventOrganizer(supabase, facePerson.event_id, userId)
  if (!isOrganizer) {
    return { error: 'Only event organizer can link users', status: 403 }
  }

  // Verify linked_user exists and is member of event
  const { data: membership } = await supabase
    .from('event_members')
    .select('id, user_id')
    .eq('event_id', facePerson.event_id)
    .eq('user_id', linked_user_id)
    .maybeSingle()

  if (!membership) {
    return { error: 'User is not a member of this event', status: 400 }
  }

  // Update face_person
  const { error: updateError } = await supabase
    .from('face_persons')
    .update({
      linked_user_id,
      status: 'linked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', face_person_id)

  if (updateError) {
    return { error: 'Failed to link user', details: updateError.message, status: 500 }
  }

  // Create media_tags for all faces in this cluster
  const { data: faces, error: facesError } = await supabase
    .from('faces')
    .select('id, media_id, bbox')
    .eq('face_person_id', face_person_id)

  if (facesError) {
    console.error('Error fetching faces for cluster:', facesError)
    return { error: 'Failed to fetch faces for tagging', details: facesError.message, status: 500 }
  }

  if (faces && faces.length > 0) {
    const tagsData = faces.map((face: any) => ({
      media_id: face.media_id,
      member_id: membership.id,  // event_members.id (pas user_id)
      tagged_by: userId,         // user_id (celui qui fait le tagging)
      source: 'face_clustering',
      bbox: face.bbox,
      face_id: face.id,
    }))

    // Insert tags (upsert to avoid duplicates)
    const { error: tagsError } = await supabase
      .from('media_tags')
      .upsert(tagsData, { onConflict: 'media_id,member_id' })

    if (tagsError) {
      console.error('Failed to create tags:', tagsError)
    }
  }

  return {
    success: true,
    face_person_id,
    linked_user_id,
    tags_created: faces?.length || 0,
    status: 200,
  }
}

// ============================================
// Action: Invite
// ============================================

async function inviteUser(supabase: any, userId: string, body: any) {
  const { face_person_id, email, message } = body

  if (!face_person_id || !email) {
    return { error: 'face_person_id and email are required', status: 400 }
  }

  // Get face_person
  const { data: facePerson, error: fetchError } = await supabase
    .from('face_persons')
    .select('event_id')
    .eq('id', face_person_id)
    .single()

  if (fetchError || !facePerson) {
    return { error: 'Face person not found', status: 404 }
  }

  // Verify user is event organizer
  const isOrganizer = await verifyEventOrganizer(supabase, facePerson.event_id, userId)
  if (!isOrganizer) {
    return { error: 'Only event organizer can send invitations', status: 403 }
  }

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('name, id')
    .eq('id', facePerson.event_id)
    .single()

  // Update face_person
  const { error: updateError } = await supabase
    .from('face_persons')
    .update({
      status: 'invited',
      invitation_email: email,
      invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', face_person_id)

  if (updateError) {
    return { error: 'Failed to update invitation status', details: updateError.message, status: 500 }
  }

  // TODO: Send actual invitation email
  // For now, just log it
  console.log(`Invitation should be sent to ${email} for event ${event?.name}`)
  console.log(`Message: ${message || 'Default invitation message'}`)

  // In production, you'd call a mail service here:
  /*
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: `You're tagged in ${event?.name}`,
      }],
      from: { email: 'no-reply@memoria.app' },
      content: [{
        type: 'text/html',
        value: `<p>${message || 'You appear in photos from this event.'}</p>`,
      }],
    }),
  })
  */

  return {
    success: true,
    face_person_id,
    email,
    message: 'Invitation sent (simulated)',
    status: 200,
  }
}

// ============================================
// Action: Merge Clusters
// ============================================

async function mergeClusters(supabase: any, userId: string, body: any) {
  const { primary_person_id, secondary_person_id } = body

  if (!primary_person_id || !secondary_person_id) {
    return { error: 'primary_person_id and secondary_person_id are required', status: 400 }
  }

  // Get both face_persons
  const { data: persons } = await supabase
    .from('face_persons')
    .select('id, event_id, linked_user_id, status')
    .in('id', [primary_person_id, secondary_person_id])

  if (!persons || persons.length !== 2) {
    return { error: 'One or both face persons not found', status: 404 }
  }

  const primary = persons.find((p: any) => p.id === primary_person_id)
  const secondary = persons.find((p: any) => p.id === secondary_person_id)

  // Must be same event
  if (primary.event_id !== secondary.event_id) {
    return { error: 'Cannot merge clusters from different events', status: 400 }
  }

  // Verify user is event organizer
  const isOrganizer = await verifyEventOrganizer(supabase, primary.event_id, userId)
  if (!isOrganizer) {
    return { error: 'Only event organizer can merge clusters', status: 403 }
  }

  // Reassign all faces from secondary to primary
  const { data: reassignedFaces, error: reassignError } = await supabase
    .from('faces')
    .update({ face_person_id: primary_person_id })
    .eq('face_person_id', secondary_person_id)
    .select('id')

  if (reassignError) {
    return { error: 'Failed to reassign faces', details: reassignError.message, status: 500 }
  }

  // Mark secondary as merged
  const { error: mergeError } = await supabase
    .from('face_persons')
    .update({
      status: 'merged',
      merged_into_id: primary_person_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', secondary_person_id)

  if (mergeError) {
    return { error: 'Failed to mark as merged', details: mergeError.message, status: 500 }
  }

  // If primary has linked user, update tags
  if (primary.linked_user_id) {
    // First, get the event_member record for the linked user
    const { data: membership } = await supabase
      .from('event_members')
      .select('id')
      .eq('event_id', primary.event_id)
      .eq('user_id', primary.linked_user_id)
      .maybeSingle()

    if (membership) {
      const { data: faces } = await supabase
        .from('faces')
        .select('id, media_id, bbox')
        .eq('face_person_id', primary_person_id)

      if (faces && faces.length > 0) {
        const tagsData = faces.map((face: any) => ({
          media_id: face.media_id,
          member_id: membership.id,  // event_members.id (pas user_id)
          tagged_by: userId,         // user_id (celui qui fait le tagging)
          source: 'face_clustering',
          bbox: face.bbox,
          face_id: face.id,
        }))

        await supabase
          .from('media_tags')
          .upsert(tagsData, { onConflict: 'media_id,member_id' })
      }
    }
  }

  return {
    success: true,
    primary_person_id,
    secondary_person_id,
    faces_reassigned: reassignedFaces?.length || 0,
    status: 200,
  }
}

// ============================================
// Action: Ignore
// ============================================

async function ignorePerson(supabase: any, userId: string, body: any) {
  const { face_person_id } = body

  if (!face_person_id) {
    return { error: 'face_person_id is required', status: 400 }
  }

  // Get face_person
  const { data: facePerson, error: fetchError } = await supabase
    .from('face_persons')
    .select('event_id')
    .eq('id', face_person_id)
    .single()

  if (fetchError || !facePerson) {
    return { error: 'Face person not found', status: 404 }
  }

  // Verify user is event organizer
  const isOrganizer = await verifyEventOrganizer(supabase, facePerson.event_id, userId)
  if (!isOrganizer) {
    return { error: 'Only event organizer can ignore clusters', status: 403 }
  }

  // Update status to ignored
  const { error: updateError } = await supabase
    .from('face_persons')
    .update({
      status: 'ignored',
      updated_at: new Date().toISOString(),
    })
    .eq('id', face_person_id)

  if (updateError) {
    return { error: 'Failed to ignore person', details: updateError.message, status: 500 }
  }

  return {
    success: true,
    face_person_id,
    status: 200,
  }
}

// ============================================
// Action: Purge (GDPR)
// ============================================

async function purgeUserData(supabase: any, userId: string, body: any) {
  const { event_id, target_user_id } = body

  if (!event_id) {
    return { error: 'event_id is required', status: 400 }
  }

  // User can purge their own data, or organizer can purge anyone
  const isOrganizer = await verifyEventOrganizer(supabase, event_id, userId)
  const targetUserId = target_user_id || userId

  if (!isOrganizer && targetUserId !== userId) {
    return { error: 'Can only purge your own data', status: 403 }
  }

  // Call the SQL function
  const { data, error } = await supabase.rpc('purge_face_data_for_user', {
    p_user_id: targetUserId,
    p_event_id: event_id,
  })

  if (error) {
    return { error: 'Failed to purge data', details: error.message, status: 500 }
  }

  return {
    success: true,
    event_id,
    user_id: targetUserId,
    deleted_faces: data.deleted_faces,
    deleted_persons: data.deleted_persons,
    deleted_tags: data.deleted_tags,
    status: 200,
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const body = await req.json()

    // Determine action from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1]

    let result

    switch (action) {
      case 'link-user':
        result = await linkUser(supabaseAdmin, user.id, body)
        break
      case 'invite':
        result = await inviteUser(supabaseAdmin, user.id, body)
        break
      case 'merge':
        result = await mergeClusters(supabaseAdmin, user.id, body)
        break
      case 'ignore':
        result = await ignorePerson(supabaseAdmin, user.id, body)
        break
      case 'purge':
        result = await purgeUserData(supabaseAdmin, user.id, body)
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', available: ['link-user', 'invite', 'merge', 'ignore', 'purge'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const { status, ...responseBody } = result

    return new Response(
      JSON.stringify(responseBody),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in face-person-actions:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

