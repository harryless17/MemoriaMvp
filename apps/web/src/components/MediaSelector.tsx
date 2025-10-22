'use client';

import { useState } from 'react';
import type { Media } from '@memoria/ui';
import { Check, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaSelectorProps {
  media: Media[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  showTagCount?: boolean;
}

export function MediaSelector({ 
  media, 
  selectedIds, 
  onSelectionChange,
  showTagCount = false 
}: MediaSelectorProps) {
  const toggleSelection = (mediaId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId);
    } else {
      newSelection.add(mediaId);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(new Set(media.map(m => m.id)));
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size > 0 ? (
            <span className="font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'média sélectionné' : 'médias sélectionnés'}
            </span>
          ) : (
            <span>Sélectionnez des médias à taguer</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-primary hover:underline"
            type="button"
          >
            Tout sélectionner
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={deselectAll}
              className="text-sm text-muted-foreground hover:underline"
              type="button"
            >
              Tout désélectionner
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {media.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
          {media.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${item.storage_path}`;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
                  "border-2 transition-all duration-200",
                  isSelected 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => toggleSelection(item.id)}
              >
                {/* Media */}
                {item.type === 'video' && !item.thumb_path ? (
                  // Video without thumbnail - show placeholder
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white" fill="white" />
                  </div>
                ) : (
                  // Photo or video with thumbnail
                  <img
                    src={publicUrl}
                    alt="Media"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Video indicator */}
                {item.type === 'video' && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Vidéo
                  </div>
                )}

                {/* Tag count badge */}
                {showTagCount && item.tag_count !== undefined && (
                  <div className={cn(
                    "absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-bold",
                    item.tag_count > 0 
                      ? "bg-green-500 text-white" 
                      : "bg-orange-500 text-white"
                  )}>
                    {item.tag_count > 0 
                      ? `${item.tag_count} ${item.tag_count === 1 ? 'personne' : 'personnes'}` 
                      : 'Non taguée'
                    }
                  </div>
                )}

                {/* Selection checkbox */}
                <div
                  className={cn(
                    "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-white/90 border-white group-hover:bg-white"
                  )}
                >
                  {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>

                {/* Hover overlay */}
                <div className={cn(
                  "absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors",
                  isSelected && "bg-primary/10"
                )} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun média disponible</p>
        </div>
      )}
    </div>
  );
}
