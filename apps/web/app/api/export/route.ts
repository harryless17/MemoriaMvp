export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const memberId = searchParams.get('memberId');
    const userId = searchParams.get('userId');

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing eventId or userId' },
        { status: 400 }
      );
    }

    // Verify user has access
    const { data: memberData } = await supabaseAdmin
      .from('event_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (!memberData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let mediaToExport: any[] = [];

    if (memberId) {
      // Export specific member's media
      if (memberData.role !== 'owner' && memberData.role !== 'co-organizer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data: tagsData } = await supabaseAdmin
        .from('media_tags')
        .select('media_id')
        .eq('member_id', memberId);

      const mediaIds = (tagsData || []).map((t: any) => t.media_id);

      if (mediaIds.length > 0) {
        const { data: mediaData } = await supabaseAdmin
          .from('media')
          .select('*')
          .in('id', mediaIds);

        mediaToExport = mediaData || [];
      }
    } else {
      // Export all event media (organizers only) or user's tagged media (participants)
      if (memberData.role === 'owner' || memberData.role === 'co-organizer') {
        const { data: mediaData } = await supabaseAdmin
          .from('media')
          .select('*')
          .eq('event_id', eventId);

        mediaToExport = mediaData || [];
      } else {
        // Participant: export their tagged media
        const { data: myMemberData } = await supabaseAdmin
          .from('event_members')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .single();

        if (myMemberData) {
          const { data: tagsData } = await supabaseAdmin
            .from('media_tags')
            .select('media_id')
            .eq('member_id', myMemberData.id);

          const mediaIds = (tagsData || []).map((t: any) => t.media_id);

          if (mediaIds.length > 0) {
            const { data: mediaData } = await supabaseAdmin
              .from('media')
              .select('*')
              .in('id', mediaIds);

            mediaToExport = mediaData || [];
          }
        }
      }
    }

    if (mediaToExport.length === 0) {
      return NextResponse.json({ error: 'No media to export' }, { status: 404 });
    }

    // Create ZIP
    const zip = new JSZip();

    // Download each media and add to zip
    for (let i = 0; i < mediaToExport.length; i++) {
      const media = mediaToExport[i];
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/media/${media.storage_path}`;

      try {
        const response = await fetch(publicUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const extension = media.storage_path.split('.').pop();
          const filename = `${i + 1}_${media.id.substring(0, 8)}.${extension}`;
          zip.file(filename, arrayBuffer);
        }
      } catch (err) {
        console.error(`Error downloading media ${media.id}:`, err);
        // Continue with other files
      }
    }

    // Generate ZIP as blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Get event title for filename
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    const filename = event
      ? `${event.title.replace(/[^a-z0-9]/gi, '_')}_photos.zip`
      : `event_${eventId}_photos.zip`;

    // Return ZIP
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting media:', error);
    return NextResponse.json(
      { error: 'Failed to export media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
