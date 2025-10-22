'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { Download, Loader2 } from 'lucide-react';

interface DownloadButtonProps {
  eventId: string;
  memberId?: string; // If specified, download only this member's media
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function DownloadButton({
  eventId,
  memberId,
  label = 'Télécharger',
  variant = 'outline',
  size = 'default',
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    try {
      setDownloading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Vous devez être connecté');
        return;
      }

      // Build URL
      const params = new URLSearchParams({
        eventId,
        userId: user.id,
      });

      if (memberId) {
        params.append('memberId', memberId);
      }

      const url = `/api/export?${params.toString()}`;

      // Trigger download
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'photos.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={downloading}
      variant={variant}
      size={size}
      className="w-full md:w-auto"
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Téléchargement...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
