'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import { Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ExportButtonProps {
  eventId: string;
  eventTitle: string;
}

export function ExportButton({ eventId, eventTitle }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setExporting(true);

    try {
      // Load all media for this event
      const { data: mediaData } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', eventId);

      if (!mediaData || mediaData.length === 0) {
        toast({
          type: 'warning',
          title: 'No media to export',
          description: 'This event has no photos or videos yet.',
        });
        return;
      }

      const zip = new JSZip();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      let successCount = 0;

      // Create event info file
      const eventInfo = {
        title: eventTitle,
        exportDate: new Date().toISOString(),
        mediaCount: mediaData.length,
      };
      zip.file('event-info.json', JSON.stringify(eventInfo, null, 2));

      // Download and add each media file
      for (const media of mediaData as any[]) {
        try {
          const mediaUrl = `${supabaseUrl}/storage/v1/object/public/media/${media.storage_path}`;
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          
          const extension = media.type === 'video' ? 'mp4' : 'jpg';
          const fileName = `${media.id}.${extension}`;
          
          zip.file(fileName, blob);
          successCount++;
        } catch (error) {
          console.error(`Failed to download ${media.id}:`, error);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const safeTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      saveAs(zipBlob, `${safeTitle}_export.zip`);

      toast({
        type: 'success',
        title: 'Export completed',
        description: `Successfully exported ${successCount} of ${mediaData.length} files.`,
      });
    } catch (error: any) {
      console.error('Error exporting event:', error);
      toast({
        type: 'error',
        title: 'Export failed',
        description: error.message || 'Please try again later.',
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className="gap-2"
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export All
        </>
      )}
    </Button>
  );
}
