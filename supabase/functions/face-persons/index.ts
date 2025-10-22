/**
 * Face Persons Edge Function
 * 
 * GET /face-persons?event_id=xxx
 * Returns all detected face clusters for an event with stats
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Get event_id from query params
    const url = new URL(req.url)
    const eventId = url.searchParams.get('event_id')

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'event_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is event member
    const { data: membership, error: memberError } = await supabaseClient
      .from('event_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch face_persons with stats using the view
    const { data: facePerson, error: facePersonsError } = await supabaseClient
      .from('face_persons_with_stats')
      .select(`
        id,
        event_id,
        cluster_label,
        representative_face_id,
        status,
        linked_user_id,
        linked_user_name,
        linked_user_avatar,
        invitation_email,
        invited_at,
        metadata,
        face_count,
        avg_quality,
        media_count,
        created_at
      `)
      .eq('event_id', eventId)
      .order('face_count', { ascending: false })

    if (facePersonsError) {
      console.error('Error fetching face_persons:', facePersonsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch face persons', details: facePersonsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For each face_person, fetch representative face details
    const facePersonsWithThumbnails = await Promise.all(
      (facePerson || []).map(async (person) => {
        if (!person.representative_face_id) {
          return { ...person, thumbnail_url: null }
        }

        // Get representative face with media info
        const { data: face, error: faceError } = await supabaseClient
          .from('faces')
          .select(`
            id,
            bbox,
            quality_score,
            media:media_id (
              id,
              storage_path,
              thumb_path,
              type
            )
          `)
          .eq('id', person.representative_face_id)
          .single()

        if (faceError) {
          console.error(`Error fetching representative face ${person.representative_face_id}:`, faceError)
        }

        return {
          ...person,
          representative_face: face || null,
        }
      })
    )

    // Get clustering job status (prefer completed jobs)
    const { data: clusteringJob } = await supabaseClient
      .from('ml_jobs')
      .select('id, status, result, error, completed_at')
      .eq('event_id', eventId)
      .eq('job_type', 'cluster')
      .in('status', ['completed', 'failed', 'processing', 'pending'])
      .order('status', { ascending: false }) // completed first, then failed, then processing, then pending
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        face_persons: facePersonsWithThumbnails,
        total_clusters: facePersonsWithThumbnails.length,
        clustering_status: clusteringJob?.status || 'not_started',
        clustering_result: clusteringJob?.result || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in face-persons:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

