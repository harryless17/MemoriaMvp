'use client'

import { User, Mail, Merge, EyeOff, Eye } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'

interface FacePersonGridProps {
  facePersons: any[]
  onAssign?: (person: any) => void
  onInvite?: (person: any) => void
  onMerge?: (person: any) => void
  onIgnore?: (personId: string) => void
  onViewDetails?: (person: any) => void
}

export default function FacePersonGrid({
  facePersons,
  onAssign,
  onInvite,
  onMerge,
  onIgnore,
  onViewDetails,
}: FacePersonGridProps) {
  return (
    <div className="contents">
      {facePersons.map((person) => (
        <FacePersonCard
          key={person.id}
          person={person}
          onAssign={onAssign}
          onInvite={onInvite}
          onMerge={onMerge}
          onIgnore={onIgnore}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}

function FacePersonCard({
  person,
  onAssign,
  onInvite,
  onMerge,
  onIgnore,
  onViewDetails,
}: {
  person: any
  onAssign?: (person: any) => void
  onInvite?: (person: any) => void
  onMerge?: (person: any) => void
  onIgnore?: (personId: string) => void
  onViewDetails?: (person: any) => void
}) {
  const representativeFace = person.representative_face
  const media = representativeFace?.media

  // Debug: Log what we have
  console.log('🔍 FacePersonCard debug:', {
    personId: person.id,
    representativeFaceId: person.representative_face_id,
    representativeFace,
    media,
    hasMedia: !!media,
    storagePath: media?.storage_path
  })

  // Get thumbnail URL with face bbox
  const getThumbnailUrl = () => {
    if (!media || !media.storage_path) {
      console.log('❌ No media or storage_path')
      return null
    }
    
    // For now, we'll use the original image from Supabase Storage
    // TODO: Later we can crop it to show just the face using bbox
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const bucket = 'media'
    
    const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${media.storage_path}`
    console.log('✅ Generated URL:', url)
    return url
  }

  const thumbnailUrl = getThumbnailUrl()
  
  // Check if this is an AI-generated cluster
  const isAIGenerated = person.metadata?.is_ai_generated || false
  const confidence = person.metadata?.confidence || 'unknown'
  const faceCount = person.metadata?.face_count || person.face_count || 1

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow border border-transparent dark:border-gray-700">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Face thumbnail"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-16 w-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {isAIGenerated && (
            <span className={`text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg ${
              confidence === 'high' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}>
              🤖 {confidence === 'high' ? 'IA Haute' : 'IA Moyenne'}
            </span>
          )}
          {!isAIGenerated && person.status === 'linked' && (
            <span className="bg-green-500 dark:bg-green-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              ✓ Identifié
            </span>
          )}
          {!isAIGenerated && person.status === 'invited' && (
            <span className="bg-blue-500 dark:bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              Invité
            </span>
          )}
          {!isAIGenerated && person.status === 'ignored' && (
            <span className="bg-gray-500 dark:bg-gray-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              Ignoré
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {person.linked_user_name ? (
          <div className="flex items-center gap-2 mb-2">
            <Avatar
              src={person.linked_user_avatar}
              name={person.linked_user_name}
              size="sm"
            />
            <p className="font-medium text-sm truncate text-gray-900 dark:text-white">
              {person.linked_user_name}
            </p>
          </div>
        ) : person.invitation_email ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
            {person.invitation_email}
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {isAIGenerated 
              ? `🤖 IA #${person.cluster_label} (${faceCount} photos)`
              : `Personne #${person.cluster_label}`
            }
          </p>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {person.face_count} photo{person.face_count > 1 ? 's' : ''} •{' '}
          {Math.round(person.avg_quality * 100)}% qualité
        </div>

        {/* View Details Button */}
        {onViewDetails && person.face_count > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(person)}
            className="w-full mb-2 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Voir toutes les photos
          </Button>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {person.status === 'pending' && (
            <>
              {onAssign && (
                <Button
                  size="sm"
                  onClick={() => onAssign(person)}
                  className="w-full"
                >
                  <User className="h-3 w-3 mr-1" />
                  Assigner
                </Button>
              )}
              {onInvite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onInvite(person)}
                  className="w-full"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Inviter
                </Button>
              )}
              <div className="flex gap-2">
                {onMerge && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMerge(person)}
                    className="flex-1"
                    title="Fusionner"
                  >
                    <Merge className="h-3 w-3" />
                  </Button>
                )}
                {onIgnore && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onIgnore(person.id)}
                    className="flex-1"
                    title="Ignorer"
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </>
          )}

          {person.status !== 'pending' && onMerge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMerge(person)}
              className="w-full"
            >
              <Merge className="h-3 w-3 mr-1" />
              Fusionner
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

