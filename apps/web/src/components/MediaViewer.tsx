'use client';

import { useEffect, useState } from 'react';
import type { Media } from '@memoria/ui';
import { getMediaUrl } from '@memoria/ui';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent } from './ui/dialog';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import { useImageOptimization } from '@/hooks/useImageOptimization';

interface MediaViewerProps {
  media: Media;
  allMedia: Media[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (media: Media) => void;
}

export function MediaViewer({ media, allMedia, isOpen, onClose, onNavigate }: MediaViewerProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const { getFullSizeUrl } = useImageOptimization();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const mediaUrl = getMediaUrl(media.storage_path, supabaseUrl);
  const optimizedMediaUrl = getFullSizeUrl(mediaUrl);

  const currentIndex = allMedia.findIndex((m) => m.id === media.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allMedia.length - 1;

  useEffect(() => {
    loadCurrentUser();
    setZoom(1); // Reset zoom when media changes
  }, [media.id]);

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  const handlePrev = () => {
    if (hasPrev) {
      onNavigate(allMedia[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(allMedia[currentIndex + 1]);
    }
  };

  const handleDownload = async () => {
    try {
      // Utiliser l'URL originale pour le téléchargement (qualité maximale)
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media_${media.id}.${media.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[95vh] flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm">
                {currentIndex + 1} / {allMedia.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls (for images only) */}
              {media.type === 'photo' && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="text-white hover:bg-white/20"
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  <span className="text-white text-sm min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    className="text-white hover:bg-white/20"
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* Previous button */}
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="absolute left-4 z-10 text-white hover:bg-white/20 w-12 h-12"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {/* Media display */}
            <div className="relative max-w-full max-h-full flex items-center justify-center p-12">
              {media.type === 'photo' ? (
                <img
                  src={optimizedMediaUrl}
                  alt=""
                  className="max-w-full max-h-[80vh] object-contain"
                  style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
                />
              ) : (
                <video
                  src={optimizedMediaUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh]"
                />
              )}
            </div>

            {/* Next button */}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 z-10 text-white hover:bg-white/20 w-12 h-12"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}
          </div>

          {/* Footer with metadata */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="text-white">
              {media.event && (
                <p className="text-sm text-white/80">
                  De l'événement: <span className="font-medium">{media.event.title}</span>
                </p>
              )}
              <p className="text-xs text-white/60 mt-1">
                {new Date(media.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
