'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Media } from '@memoria/ui';
import { getMediaUrl, getThumbUrl } from '@memoria/ui';
import { MediaViewer } from './MediaViewer';
import { OptimizedImage } from './OptimizedImage';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { useToast } from './ui/toast';
import { Play, Trash2, Download, Eye } from 'lucide-react';

interface OptimizedMediaGridProps {
  media: Media[];
  onMediaDeleted?: () => void;
  gridSize?: 'small' | 'medium' | 'large';
  showDownloadButton?: boolean;
}

export function OptimizedMediaGrid({ 
  media, 
  onMediaDeleted,
  gridSize = 'medium',
  showDownloadButton = false
}: OptimizedMediaGridProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { getThumbnailUrl, getPreviewUrl, getFullSizeUrl } = useImageOptimization();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  const handleDelete = async (media: Media, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', media.id);

      if (error) throw error;

      onMediaDeleted?.();
    } catch (error) {
      console.error('Error deleting media:', error);
      // Toast notification would go here
    }
  };

  const handleDownload = async (media: Media, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const fullSizeUrl = getFullSizeUrl(getMediaUrl(media.storage_path, supabaseUrl));
      const response = await fetch(fullSizeUrl);
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

  // Configuration de la grille selon la taille
  const gridConfig = {
    small: 'columns-2 md:columns-3 lg:columns-4',
    medium: 'columns-2 md:columns-3 lg:columns-4 xl:columns-5',
    large: 'columns-1 md:columns-2 lg:columns-3 xl:columns-4'
  };

  const imageSize = {
    small: 'thumbnail' as const,
    medium: 'small' as const,
    large: 'medium' as const
  };

  return (
    <>
      <div className={`${gridConfig[gridSize]} gap-4 space-y-4`}>
        {media.map((item) => {
          const thumbUrl = getThumbUrl(item.thumb_path, supabaseUrl) || getMediaUrl(item.storage_path, supabaseUrl);
          const optimizedThumbUrl = getThumbnailUrl(thumbUrl);
          const canDelete = currentUser && item.user_id === currentUser.id;

          return (
            <div
              key={item.id}
              className="relative break-inside-avoid mb-4 group"
              onClick={() => setSelectedMedia(item)}
            >
              <div className="glass-card overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300">
                {item.type === 'video' && !item.thumb_path ? (
                  // Video without thumbnail - show placeholder
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-white mx-auto mb-2" fill="white" />
                      <p className="text-white text-sm font-medium">Vidéo</p>
                    </div>
                  </div>
                ) : (
                  // Photo or video with optimized thumbnail
                  <OptimizedImage
                    src={optimizedThumbUrl}
                    alt=""
                    size={imageSize[gridSize]}
                    quality="medium"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                
                {/* Video play overlay */}
                {item.type === 'video' && item.thumb_path && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {showDownloadButton && (
                    <button
                      onClick={(e) => handleDownload(item, e)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 hover:scale-110 shadow-lg"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canDelete && (
                    <button
                      onClick={(e) => handleDelete(item, e)}
                      className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl transition-colors duration-200 hover:scale-110 shadow-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* View button */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(item);
                    }}
                    className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-xl transition-colors duration-200 hover:scale-110 shadow-lg"
                    title="Voir en grand"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Media Viewer avec images optimisées */}
      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          allMedia={media}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onNavigate={setSelectedMedia}
        />
      )}
    </>
  );
}
