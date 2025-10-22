'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { X, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ClusterDetailModalProps {
  facePerson: any
  eventId: string
  onClose: () => void
  onFaceRemoved?: () => void
}

export default function ClusterDetailModal({
  facePerson,
  eventId,
  onClose,
  onFaceRemoved,
}: ClusterDetailModalProps) {
  const [faces, setFaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    loadFaces()
  }, [facePerson.id])

  async function loadFaces() {
    try {
      setLoading(true)
      
      console.log('🔄 Loading faces for cluster:', facePerson.id)
      
      // Fetch all faces in this cluster (with timestamp to avoid cache)
      const { data: facesData, error } = await supabase
        .from('faces')
        .select(`
          id,
          bbox,
          quality_score,
          media:media_id (
            id,
            storage_path,
            type,
            created_at
          )
        `)
        .eq('face_person_id', facePerson.id)
        .order('quality_score', { ascending: false })

      if (error) throw error
      
      console.log(`✅ Loaded ${facesData?.length || 0} faces`)
      setFaces(facesData || [])
    } catch (err: any) {
      console.error('Error loading faces:', err)
      alert('Échec du chargement des photos')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveFace(faceId: string) {
    if (!confirm('Retirer cette photo du cluster ?\n\nElle sera déplacée dans un nouveau cluster "À vérifier" et les tags seront supprimés.')) {
      return
    }

    try {
      setRemoving(faceId)
      console.log('🗑️ Removing face:', faceId)
      
      // 1. Récupérer les infos de la face pour avoir le media_id et quality_score
      const { data: faceData, error: faceError } = await supabase
        .from('faces')
        .select('media_id, face_person_id, quality_score, event_id')
        .eq('id', faceId)
        .single()

      if (faceError) throw faceError
      
      console.log('📸 Face data:', faceData)
      
      const faceEventId = (faceData as any).event_id

      // 2. Supprimer les tags associés à cette face dans media_tags
      const { data: deletedTags, error: tagsError } = await supabase
        .from('media_tags')
        .delete()
        .eq('face_id', faceId)
        .select()

      if (tagsError) {
        console.error('⚠️ Warning: Could not delete tags:', tagsError)
      } else {
        console.log(`🗑️ Deleted ${deletedTags?.length || 0} tag(s)`)
      }

      // 3. Trouver le prochain cluster_label disponible pour l'événement
      const { data: maxLabelData } = await (supabase
        .from('face_persons') as any)
        .select('cluster_label')
        .eq('event_id', faceEventId)
        .order('cluster_label', { ascending: false })
        .limit(1)
        .single()

      const nextLabel = ((maxLabelData as any)?.cluster_label || 0) + 1
      console.log('🔢 Next available cluster label:', nextLabel)

      // 4. Créer un nouveau cluster singleton pour cette face
      const { data: newCluster, error: clusterError } = await (supabase
        .from('face_persons') as any)
        .insert({
          event_id: faceEventId,
          cluster_label: nextLabel,
          status: 'pending',
          metadata: {
            face_count: 1,
            avg_quality: (faceData as any).quality_score || 0,
            is_singleton: true,
            created_from_removal: true
          }
        })
        .select()
        .single()

      if (clusterError) throw clusterError
      
      console.log('✅ New singleton cluster created:', newCluster)

      // 5. Assigner la face au nouveau cluster
      const { error: updateError, data: updatedFace } = await (supabase
        .from('faces') as any)
        .update({ face_person_id: (newCluster as any).id })
        .eq('id', faceId)
        .select()

      if (updateError) throw updateError
      
      console.log('✅ Face reassigned to new cluster:', updatedFace)

      // 6. Mettre à jour la face représentative du nouveau cluster
      await (supabase
        .from('face_persons') as any)
        .update({ representative_face_id: faceId })
        .eq('id', (newCluster as any).id)

      // 7. Attendre un instant pour que la DB se synchronise
      await new Promise(resolve => setTimeout(resolve, 500))

      // 8. Refresh the faces list (du cluster actuel)
      console.log('🔄 Refreshing faces list...')
      await loadFaces()
      
      // 9. Notify parent to refresh (pour afficher le nouveau cluster)
      if (onFaceRemoved) {
        console.log('📢 Notifying parent component...')
        onFaceRemoved()
      }

      console.log('✅ Face removal complete')
      alert(`✅ Photo retirée !\n\nUn nouveau cluster "À vérifier" a été créé avec cette photo.`)
    } catch (err: any) {
      console.error('❌ Error removing face:', err)
      alert('Échec du retrait de la photo : ' + (err.message || 'Erreur inconnue'))
    } finally {
      setRemoving(null)
    }
  }

  const getImageUrl = (face: any) => {
    if (!face.media?.storage_path) return null
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/media/${face.media.storage_path}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {facePerson.linked_user_name || `Personne #${facePerson.cluster_label}`}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {faces.length} photo{faces.length > 1 ? 's' : ''} dans ce cluster
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : faces.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucune photo dans ce cluster
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {faces.map((face) => {
                const imageUrl = getImageUrl(face)
                return (
                  <div
                    key={face.id}
                    className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden aspect-square group"
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt="Face"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveFace(face.id)}
                        disabled={removing === face.id || faces.length <= 1}
                        className="shadow-lg"
                      >
                        {removing === face.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Retirer
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Quality badge */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {Math.round(face.quality_score * 100)}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {faces.length === 1 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ℹ️ C'est la dernière photo de ce cluster. Vous ne pouvez pas la retirer.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

