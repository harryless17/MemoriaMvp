import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { face_id } = await req.json()

    if (!face_id) {
      return new Response(
        JSON.stringify({ error: 'face_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get face details with media info
    const { data: faceData, error: faceError } = await supabaseClient
      .from('faces')
      .select(`
        id,
        media_id,
        bbox,
        media:media_id (
          id,
          storage_path
        )
      `)
      .eq('id', face_id)
      .single()

    if (faceError || !faceData) {
      return new Response(
        JSON.stringify({ error: 'Face not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get signed URL for the original media
    const { data: signedUrlData, error: urlError } = await supabaseClient.storage
      .from('media')
      .createSignedUrl(faceData.media.storage_path, 3600) // 1 hour

    if (urlError || !signedUrlData) {
      return new Response(
        JSON.stringify({ error: 'Failed to get media URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the face thumbnail info
    return new Response(
      JSON.stringify({
        face_id: faceData.id,
        media_id: faceData.media_id,
        bbox: faceData.bbox,
        original_image_url: signedUrlData.signedUrl,
        thumbnail_url: signedUrlData.signedUrl // For now, return original. Later we can crop it
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
