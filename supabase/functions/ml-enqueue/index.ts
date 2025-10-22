/**
 * ML Enqueue Edge Function
 * 
 * Enqueues face detection or clustering jobs to the ml_jobs table.
 * Called after media upload or when user triggers clustering.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnqueueDetectRequest {
  type: 'detect'
  event_id: string
  media_ids: string[]  // batch of media to process
  priority?: 'high' | 'normal' | 'low'
}

interface EnqueueClusterRequest {
  type: 'cluster'
  event_id: string
  priority?: 'high' | 'normal' | 'low'
}

type EnqueueRequest = EnqueueDetectRequest | EnqueueClusterRequest

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user's JWT
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

    // Parse request
    const request: EnqueueRequest = await req.json()

    // Validate event access
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, face_recognition_enabled, owner_id')
      .eq('id', request.event_id)
      .single()

    if (eventError || !event) {
      console.error('Event fetch error:', eventError)
      return new Response(
        JSON.stringify({ error: 'Event not found', details: eventError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if face recognition is enabled
    if (!event.face_recognition_enabled) {
      return new Response(
        JSON.stringify({ error: 'Face recognition not enabled for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only event creator can trigger clustering
    if (event.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only event creator can trigger face analysis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for inserting jobs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SIMPLIFIED WORKFLOW:
    // 1. Detect faces in media that don't have faces yet
    // 2. Cluster ALL unassigned faces (preserving existing assignments)
    
    console.log('🔄 Starting smart clustering for event:', request.event_id)
    
    const workerUrl = Deno.env.get('WORKER_URL') || 'http://host.docker.internal:8080'
    
    // Step 1: Find media without faces detected
    // First, get all media for this event
    const { data: allMedia, error: allMediaError } = await supabaseAdmin
      .from('media')
      .select('id, storage_path')
      .eq('event_id', request.event_id)

    if (allMediaError) {
      throw new Error(`Failed to fetch media: ${allMediaError.message}`)
    }

    // Get media_ids that already have faces
    const { data: facesData, error: facesError } = await supabaseAdmin
      .from('faces')
      .select('media_id')
      .eq('event_id', request.event_id)

    if (facesError) {
      throw new Error(`Failed to fetch faces: ${facesError.message}`)
    }

    // Filter out media that already have faces
    const processedMediaIds = new Set((facesData || []).map((f: any) => f.media_id))
    const mediaWithoutFaces = (allMedia || []).filter((m: any) => !processedMediaIds.has(m.id))

    console.log(`📸 Found ${mediaWithoutFaces?.length || 0} media without faces`)

    // Step 2: Detect faces in new media (if any)
    if (mediaWithoutFaces && mediaWithoutFaces.length > 0) {
      console.log(`🔍 Triggering face detection for ${mediaWithoutFaces.length} media...`)
      
      for (const media of mediaWithoutFaces) {
        try {
          // Get signed URL
          const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
            .from('media')
            .createSignedUrl(media.storage_path, 3600)

          if (urlError || !signedUrlData) {
            console.error(`Failed to get signed URL for media ${media.id}:`, urlError)
            continue
          }

          // Trigger worker detection
          const response = await fetch(`${workerUrl}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_id: media.id,
              signed_url: signedUrlData.signedUrl
            })
          })

          if (!response.ok) {
            console.error(`Failed to trigger detection for media ${media.id}`)
          } else {
            console.log(`✅ Detection triggered for media ${media.id}`)
          }
        } catch (error) {
          console.error(`Error processing media ${media.id}:`, error)
        }
      }
      
      // Wait for face detection to complete
      console.log('⏳ Waiting 3 seconds for face detection...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Step 3: Create cluster job (will cluster only unassigned faces)
    console.log('📊 Creating cluster job...')
    
    const { data: clusterJob, error: clusterError } = await supabaseAdmin
      .from('ml_jobs')
      .insert({
        job_type: 'cluster',
        event_id: request.event_id,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (clusterError) {
      throw new Error(`Failed to create cluster job: ${clusterError.message}`)
    }

    console.log('✅ Created cluster job:', clusterJob.id)

    // Step 4: Trigger clustering
    try {
      console.log(`🚀 Triggering clustering for job ${clusterJob.id}...`)
      const clusterResponse = await fetch(`${workerUrl}/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: clusterJob.id,
          event_id: request.event_id
        })
      })

      if (!clusterResponse.ok) {
        console.error('❌ Failed to trigger clustering:', clusterResponse.status, clusterResponse.statusText)
      } else {
        console.log('✅ Clustering triggered successfully')
      }
    } catch (error) {
      console.error('❌ Error triggering clustering:', error)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Face detection and clustering started',
        new_media_processed: mediaWithoutFaces?.length || 0,
        cluster_job_id: clusterJob.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ml-enqueue:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

