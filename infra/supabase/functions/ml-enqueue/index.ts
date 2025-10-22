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
      .select('id, face_recognition_enabled, created_by')
      .eq('id', request.event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
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
    if (event.created_by !== user.id) {
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

    let jobData: any = {
      job_type: request.type,
      event_id: request.event_id,
      priority: request.priority || 'normal',
      status: 'pending',
    }

    if (request.type === 'detect') {
      jobData.media_ids = request.media_ids
    }

    // Insert job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('ml_jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to enqueue job', details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Optionally trigger worker via webhook here
    // For now, worker polls the database

    console.log(`Job ${job.id} enqueued: ${request.type} for event ${request.event_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        job_type: request.type,
        status: 'pending',
        message: `${request.type === 'detect' ? 'Face detection' : 'Clustering'} job enqueued`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in ml-enqueue:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

