'use client';

import { useState } from 'react';
import { User, Mail, Merge, EyeOff, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { OptimizedImage } from './OptimizedImage';
import { useImageOptimization } from '@/hooks/useImageOptimization';

interface OptimizedFaceCardProps {
  person: any;
  onAssign?: (person: any) => void;
  onInvite?: (person: any) => void;
  onMerge?: (person: any) => void;
  onIgnore?: (personId: string) => void;
  onViewDetails?: (person: any) => void;
}

export function OptimizedFaceCard({
  person,
  onAssign,
  onInvite,
  onMerge,
  onIgnore,
  onViewDetails,
}: OptimizedFaceCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { getThumbnailUrl, getPreviewUrl } = useImageOptimization();
  
  const representativeFace = person.representative_face;
  const media = representativeFace?.media;

  // Générer l'URL optimisée pour le visage
  const getOptimizedFaceUrl = () => {
    if (!media || !media.storage_path) {
      return null;
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucket = 'media';
    const originalUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${media.storage_path}`;
    
    // Utiliser une miniature optimisée pour les visages
    return getThumbnailUrl(originalUrl);
  };

  const optimizedFaceUrl = getOptimizedFaceUrl();
  
  // Check if this is an AI-generated cluster
  const isAIGenerated = person.metadata?.is_ai_generated || false;
  const confidence = person.metadata?.confidence || 'unknown';
  const faceCount = person.metadata?.face_count || person.face_count || 1;

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow border border-transparent dark:border-gray-700">
      {/* Thumbnail optimisé */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        {optimizedFaceUrl ? (
          <OptimizedImage
            src={optimizedFaceUrl}
            alt="Face thumbnail"
            size="thumbnail"
            quality="medium"
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <User className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {person.status === 'linked' && (
            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              ✅ Lié
            </div>
          )}
          {person.status === 'invited' && (
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              📧 Invité
            </div>
          )}
          {person.status === 'ignored' && (
            <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              🚫 Ignoré
            </div>
          )}
        </div>

        {/* Face count badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {faceCount} photo{faceCount > 1 ? 's' : ''}
        </div>

        {/* AI confidence badge */}
        {isAIGenerated && (
          <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            🤖 IA: {Math.round(confidence * 100)}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar 
              className="w-8 h-8"
              fallback={person.name?.charAt(0) || '?'}
            />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {person.name || 'Personne non identifiée'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {faceCount} visage{faceCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(person)}
              className="flex-1 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Détails
            </Button>
          )}
          
          {person.status === 'pending' && onAssign && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAssign(person)}
              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <User className="w-3 h-3 mr-1" />
              Assigner
            </Button>
          )}
          
          {person.status === 'pending' && onInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInvite(person)}
              className="flex-1 text-xs"
            >
              <Mail className="w-3 h-3 mr-1" />
              Inviter
            </Button>
          )}
          
          {onMerge && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMerge(person)}
              className="flex-1 text-xs"
            >
              <Merge className="w-3 h-3 mr-1" />
              Fusionner
            </Button>
          )}
          
          {onIgnore && person.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onIgnore(person.id)}
              className="flex-1 text-xs text-gray-500 hover:text-red-500"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Ignorer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
