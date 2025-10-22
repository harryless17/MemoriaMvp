/**
 * ML Callback Edge Function
 * 
 * Receives callbacks from the ML worker after job completion.
 * Secured with a secret token.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CallbackRequest {
  job_id: string
  status: 'completed' | 'failed'
  result?: {
    media_id?: string
    event_id?: string
    faces_detected?: number
    clusters_created?: number
    processing_time_seconds?: number
    [key: string]: any
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify secret token
    const authHeader = req.headers.get('Authorization')
    const expectedToken = `Bearer ${Deno.env.get('ML_CALLBACK_SECRET')}`

    if (!authHeader || authHeader !== expectedToken) {
      console.error('Unauthorized callback attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse callback data
    const callback: CallbackRequest = await req.json()

    console.log(`Callback received for job ${callback.job_id}: ${callback.status}`)

    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update job status
    const updateData: any = {
      status: callback.status,
      updated_at: new Date().toISOString(),
    }

    if (callback.result) {
      updateData.result = callback.result
    }

    if (callback.error) {
      updateData.error = callback.error
    }

    if (callback.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('ml_jobs')
      .update(updateData)
      .eq('id', callback.job_id)

    if (updateError) {
      console.error('Failed to update job:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update job', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If clustering completed, create notification for event creator
    if (callback.status === 'completed' && callback.result?.clusters_created !== undefined) {
      const { data: job } = await supabase
        .from('ml_jobs')
        .select('event_id')
        .eq('id', callback.job_id)
        .single()

      if (job) {
        const { data: event } = await supabase
          .from('events')
          .select('created_by, name')
          .eq('id', job.event_id)
          .single()

        if (event) {
          // Create notification
          await supabase.from('notifications').insert({
            user_id: event.created_by,
            type: 'face_clustering_ready',
            data: {
              event_id: job.event_id,
              event_name: event.name,
              clusters_count: callback.result.clusters_created,
              job_id: callback.job_id,
            },
            read: false,
          })

          console.log(`Notification created for user ${event.created_by}`)
        }
      }
    }

    // If detect job completed, check if we should trigger clustering
    if (callback.status === 'completed' && callback.result?.faces_detected !== undefined) {
      const eventId = callback.result.event_id

      // Count total faces detected for this event
      const { count: totalFaces } = await supabase
        .from('faces')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      // Count media in event
      const { count: totalMedia } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      // Trigger clustering if we've processed most media and have enough faces
      const CLUSTERING_THRESHOLD = 0.8  // 80% of media processed
      const MIN_FACES_FOR_CLUSTERING = 10

      if (totalMedia && totalFaces) {
        const { count: processedMedia } = await supabase
          .from('faces')
          .select('media_id', { count: 'exact', head: true })
          .eq('event_id', eventId)

        if (
          processedMedia &&
          processedMedia / totalMedia >= CLUSTERING_THRESHOLD &&
          totalFaces >= MIN_FACES_FOR_CLUSTERING
        ) {
          // Check if clustering job already exists
          const { data: existingClusterJob } = await supabase
            .from('ml_jobs')
            .select('id')
            .eq('event_id', eventId)
            .eq('job_type', 'cluster')
            .in('status', ['pending', 'processing'])
            .maybeSingle()

          if (!existingClusterJob) {
            // Enqueue clustering job
            const { error: clusterJobError } = await supabase
              .from('ml_jobs')
              .insert({
                job_type: 'cluster',
                event_id: eventId,
                status: 'pending',
                priority: 'normal',
              })

            if (!clusterJobError) {
              console.log(`Auto-triggered clustering job for event ${eventId}`)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, job_id: callback.job_id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in ml-callback:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

