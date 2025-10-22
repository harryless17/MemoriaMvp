import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { source_face_person_id, linked_user_id, event_id, delete_source, merge_if_exists } = await req.json()

    if (!source_face_person_id || !linked_user_id || !event_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if user already has a cluster for this event
    let targetClusterId = null
    let merged = false
    
    if (merge_if_exists) {
      const { data: existingCluster } = await supabase
        .from('face_persons')
        .select('id')
        .eq('event_id', event_id)
        .eq('linked_user_id', linked_user_id)
        .eq('status', 'linked')
        .limit(1)
        .maybeSingle()
      
      if (existingCluster) {
        targetClusterId = existingCluster.id
        merged = true
      }
    }

    // Get the source cluster
    const { data: sourceCluster, error: sourceError } = await supabase
      .from('face_persons')
      .select('*')
      .eq('id', source_face_person_id)
      .single()

    if (sourceError || !sourceCluster) {
      return new Response(
        JSON.stringify({ error: 'Source cluster not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all faces from the source cluster
    const { data: sourceFaces, error: facesError } = await supabase
      .from('faces')
      .select('*')
      .eq('face_person_id', source_face_person_id)

    if (facesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to get source faces' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no existing cluster, create a new one
    let newCluster
    if (!targetClusterId) {
      // Get the next available cluster_label
      const { data: maxLabelData } = await supabase
        .from('face_persons')
        .select('cluster_label')
        .eq('event_id', event_id)
        .order('cluster_label', { ascending: false })
        .limit(1)
      
      const nextLabel = maxLabelData && maxLabelData.length > 0 
        ? (maxLabelData[0].cluster_label + 1) 
        : 0

      // Create a new cluster for this user
      const { data: createdCluster, error: clusterError } = await supabase
        .from('face_persons')
        .insert({
          event_id: event_id,
          cluster_label: nextLabel,
          representative_face_id: sourceCluster.representative_face_id,
          linked_user_id: linked_user_id,
          status: 'linked',
          metadata: sourceCluster.metadata
        })
        .select()
        .single()

      if (clusterError || !createdCluster) {
        console.error('Cluster creation error:', clusterError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create new cluster', 
            details: clusterError?.message || 'Unknown error',
            nextLabel 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      newCluster = createdCluster
      targetClusterId = createdCluster.id
    } else {
      // Use existing cluster
      const { data: existingClusterData } = await supabase
        .from('face_persons')
        .select('*')
        .eq('id', targetClusterId)
        .single()
      
      newCluster = existingClusterData
    }

    // Copy faces to the target cluster, avoiding duplicates
    if (sourceFaces && sourceFaces.length > 0) {
      // Get existing faces in the target cluster to avoid duplicates
      const { data: existingFaces } = await supabase
        .from('faces')
        .select('media_id')
        .eq('face_person_id', targetClusterId)
      
      const existingMediaIds = new Set(existingFaces?.map(f => f.media_id) || [])
      
      // Filter out faces that would create duplicates
      const facesToInsert = sourceFaces.filter(face => 
        !existingMediaIds.has(face.media_id)
      )
      
      console.log(`📊 Deduplication: ${sourceFaces.length} source faces, ${existingMediaIds.size} existing, ${facesToInsert.length} to insert`)
      
      if (facesToInsert.length > 0) {
        const newFaces = facesToInsert.map(face => ({
          event_id: face.event_id,
          media_id: face.media_id,
          face_person_id: targetClusterId,
          bbox: face.bbox,
          quality_score: face.quality_score,
          embedding: face.embedding
        }))

        const { error: insertError } = await supabase
          .from('faces')
          .insert(newFaces)

        if (insertError) {
          console.error('Face insertion error:', insertError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to copy faces', 
              details: insertError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`✅ Inserted ${newFaces.length} faces without duplicates`)
      } else {
        console.log(`⚠️ All faces already exist in target cluster, skipping insertion`)
      }
      
      // Delete the original unassigned faces from the source cluster to avoid duplicates
      const faceIdsToDelete = sourceFaces.map(f => f.id)
      if (faceIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('faces')
          .delete()
          .in('id', faceIdsToDelete)
        
        if (deleteError) {
          console.error('⚠️ Failed to delete source faces:', deleteError)
        } else {
          console.log(`🗑️ Deleted ${faceIdsToDelete.length} source faces to avoid duplicates`)
        }
      }
    }

    // Get or create event_member for this user
    let eventMember
    const { data: existingMember } = await supabase
      .from('event_members')
      .select('id, name, email')
      .eq('event_id', event_id)
      .eq('user_id', linked_user_id)
      .maybeSingle()

    if (existingMember) {
      eventMember = existingMember
      console.log(`✅ Found existing event_member: ${eventMember.id}`)
    } else {
      // Create event_member if it doesn't exist
      console.log(`⚠️ Event member not found for user ${linked_user_id}, creating one...`)
      
      // Get user profile to get name and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', linked_user_id)
        .single()
      
      const { data: newMember, error: createError } = await supabase
        .from('event_members')
        .insert({
          event_id: event_id,
          user_id: linked_user_id,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          role: 'participant'
        })
        .select('id, name, email')
        .single()
      
      if (createError || !newMember) {
        console.error(`❌ Failed to create event_member:`, createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create event member', details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      eventMember = newMember
      console.log(`✅ Created new event_member: ${eventMember.id}`)
    }

    // Create media tags for all media in this cluster
    const mediaIds = [...new Set(sourceFaces?.map(f => f.media_id) || [])]
    const mediaTags = mediaIds.map(mediaId => ({
      media_id: mediaId,
      member_id: eventMember.id,
      tagged_by: linked_user_id,
      source: 'face_clustering',
      face_id: sourceFaces?.find(f => f.media_id === mediaId)?.id
    }))

    console.log(`📝 Creating ${mediaTags.length} media tags for member ${eventMember.id}`)

    if (mediaTags.length > 0) {
      const { data: insertedTags, error: tagsError } = await supabase
        .from('media_tags')
        .upsert(mediaTags, { onConflict: 'media_id,member_id' })
        .select()

      if (tagsError) {
        console.error('❌ Failed to create media tags:', tagsError)
      } else {
        console.log(`✅ Created ${insertedTags?.length || mediaTags.length} media tags successfully`)
      }
    }

    // Optionally delete the source cluster if requested
    // This is only done on the LAST assignment in a multi-select scenario
    if (delete_source === true) {
      await supabase
        .from('face_persons')
        .delete()
        .eq('id', source_face_person_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_cluster_id: newCluster.id,
        faces_copied: sourceFaces?.length || 0,
        tags_created: mediaTags.length,
        merged: merged
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
