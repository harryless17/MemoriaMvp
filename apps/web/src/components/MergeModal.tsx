'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { X, Merge, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface MergeModalProps {
  facePerson: any
  eventId: string
  allFacePersons: any[]
  onClose: () => void
  onSuccess: () => void
}

export default function MergeModal({
  facePerson,
  eventId,
  allFacePersons,
  onClose,
  onSuccess,
}: MergeModalProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Filter out current person and ignored/merged persons
  const mergeCandidates = (allFacePersons || []).filter(
    (p) =>
      p && 
      facePerson &&
      p.id !== facePerson.id &&
      p.status !== 'ignored' &&
      p.status !== 'merged'
  )
  
  // Vérifications de sécurité - APRÈS les hooks
  if (!facePerson) {
    return null
  }

  // Helper to get image URL from storage_path
  const getImageUrl = (person: any) => {
    if (!person) return null
    const media = person.representative_face?.media
    if (!media?.storage_path) return null
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/media/${media.storage_path}`
  }

  async function handleMerge() {
    if (!selectedPersonId) return

    if (
      !confirm(
        'Êtes-vous sûr de vouloir fusionner ces clusters ? Cette action est irréversible.'
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvxipiqffizembeyauwt.supabase.co'
      const response = await fetch(
        `${supabaseUrl}/functions/v1/face-person-actions/merge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            primary_person_id: facePerson.id,
            secondary_person_id: selectedPersonId,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Échec de la fusion des clusters')
      }

      const result = await response.json()
      alert(`Succès ! ${result.faces_reassigned} visages fusionnés.`)
      onSuccess()
    } catch (err: any) {
      console.error('Error merging clusters:', err)
      alert(err.message || 'Échec de la fusion des clusters')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fusionner des Clusters</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Info */}
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Fusionner un autre cluster dans celui-ci. Tous les visages du cluster sélectionné
              seront réassignés. Cette action est irréversible.
            </p>
          </div>

          {/* Current cluster */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cluster principal (à conserver)
            </h3>
            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {getImageUrl(facePerson) ? (
                    <Image
                      src={getImageUrl(facePerson)!}
                      alt="Visage"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Merge className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {facePerson?.linked_user_name ||
                      `Personne #${facePerson?.cluster_label || '?'}`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {facePerson?.face_count || 0} photos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Select cluster to merge */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fusionner avec (sera supprimé)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mergeCandidates.map((person) => {
                if (!person) return null
                const imageUrl = getImageUrl(person)
                return (
                  <button
                    key={person.id}
                    onClick={() => setSelectedPersonId(person.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedPersonId === person.id
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt="Visage"
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Merge className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {person?.linked_user_name ||
                          `Personne #${person?.cluster_label || '?'}`}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {person?.face_count || 0} photos
                      </p>
                      {person?.status && person.status !== 'pending' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Statut: {person.status}
                        </span>
                      )}
                    </div>
                    {selectedPersonId === person.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {mergeCandidates.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Aucun autre cluster disponible pour la fusion
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleMerge}
            className="flex-1"
            disabled={!selectedPersonId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fusion...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 mr-2" />
                Fusionner les Clusters
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

