'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Media } from '@memoria/ui';
import { getMediaUrl, getThumbUrl } from '@memoria/ui';
import { MediaViewer } from './MediaViewer';
import { LazyImage } from './LazyImage';
import { useToast } from './ui/toast';
import { Play, Trash2 } from 'lucide-react';

interface MediaGridProps {
  media: Media[];
  onMediaDeleted?: () => void;
}

export function MediaGrid({ media, onMediaDeleted }: MediaGridProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  const handleDelete = async (item: Media, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      // Delete from storage
      await supabase.storage.from('media').remove([item.storage_path]);

      // Delete from database
      const { error } = await supabase.from('media').delete().eq('id', item.id);

      if (error) throw error;

      toast({
        type: 'success',
        title: 'Media deleted',
        description: 'The media has been successfully deleted.',
      });
      onMediaDeleted?.();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        type: 'error',
        title: 'Error deleting media',
        description: 'Please try again later.',
      });
    }
  };

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {media.map((item) => {
          const thumbUrl = getThumbUrl(item.thumb_path, supabaseUrl) || getMediaUrl(item.storage_path, supabaseUrl);
          const canDelete = currentUser && item.user_id === currentUser.id;

          return (
            <div
              key={item.id}
              className="relative break-inside-avoid mb-4 group"
              onClick={() => setSelectedMedia(item)}
            >
              <div className="glass-card overflow-hidden cursor-pointer">
                {item.type === 'video' && !item.thumb_path ? (
                  // Video without thumbnail - show placeholder
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-white mx-auto mb-2" fill="white" />
                      <p className="text-white text-sm font-medium">Vidéo</p>
                    </div>
                  </div>
                ) : (
                  // Photo or video with thumbnail
                  <LazyImage
                    src={thumbUrl}
                    alt=""
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {item.type === 'video' && item.thumb_path && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(item, e)}
                    className="absolute top-3 left-3 p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

