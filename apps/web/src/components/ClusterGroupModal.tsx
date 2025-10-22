'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { X, Users, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import AssignModalV2 from './AssignModalV2'

interface ClusterGroupModalProps {
  clusters: any[] // Array of clusters that share the same photo
  eventId: string
  onClose: () => void
  onAssigned?: () => void
}

export default function ClusterGroupModal({
  clusters,
  eventId,
  onClose,
  onAssigned,
}: ClusterGroupModalProps) {
  const [selectedClusters, setSelectedClusters] = useState<string[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningCluster, setAssigningCluster] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Get the first cluster's photo info (they should all be the same)
  const sampleCluster = clusters[0]
  const photoCount = clusters.length // Number of people detected = number of clusters

  const toggleClusterSelection = (clusterId: string) => {
    setSelectedClusters(prev => 
      prev.includes(clusterId) 
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    )
  }

  const selectAllClusters = () => {
    setSelectedClusters(clusters.map(c => c.id))
  }

  const clearAllSelections = () => {
    setSelectedClusters([])
  }

  const handleAssignCluster = (cluster: any) => {
    setAssigningCluster(cluster)
    setShowAssignModal(true)
  }

  const handleMultiAssign = async () => {
    if (selectedClusters.length === 0) return

    try {
      setLoading(true)
      
      // For now, we'll assign them one by one
      // In the future, we could implement a bulk assignment API
      alert(`Assignation de ${selectedClusters.length} cluster(s) sélectionné(s).\n\nCette fonctionnalité sera implémentée prochainement.`)
      
      if (onAssigned) onAssigned()
    } catch (err) {
      console.error('Error in multi-assign:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Photo avec {photoCount} personne{photoCount > 1 ? 's' : ''} détectée{photoCount > 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cette photo contient {photoCount} visage{photoCount > 1 ? 's' : ''} distinct{photoCount > 1 ? 's' : ''}. 
                Assignez chaque cluster à la personne correspondante.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Photo preview */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {sampleCluster.thumbnail_url ? (
                  <Image
                    src={sampleCluster.thumbnail_url}
                    alt="Photo avec plusieurs personnes"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Photo partagée
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {photoCount} personne{photoCount > 1 ? 's' : ''} détectée{photoCount > 1 ? 's' : ''} dans cette photo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Qualité moyenne: {sampleCluster.avg_quality ? `${Math.round(sampleCluster.avg_quality)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Clusters list */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {/* Multi-select controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllClusters}
                  className="text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Tout sélectionner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSelections}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Tout désélectionner
                </Button>
                <span className="text-sm text-gray-500 self-center">
                  {selectedClusters.length} sélectionné(s)
                </span>
              </div>

              {/* Clusters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clusters.map((cluster, index) => {
                  const isSelected = selectedClusters.includes(cluster.id)
                  const isAssigned = !!cluster.linked_user_id
                  
                  return (
                    <div
                      key={cluster.id}
                      className={cn(
                        'p-4 rounded-lg border transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {cluster.thumbnail_url ? (
                            <Image
                              src={cluster.thumbnail_url}
                              alt={`Personne ${index + 1}`}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Users className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Personne #{index + 1}
                            </h4>
                            {isAssigned && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {cluster.metadata?.face_count || 1} photo{cluster.metadata?.face_count > 1 ? 's' : ''} • 
                            {cluster.avg_quality ? ` ${Math.round(cluster.avg_quality)}%` : ' N/A'} qualité
                          </p>
                          
                          {isAssigned ? (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✅ Déjà assigné
                            </p>
                          ) : (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ Non assigné
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAssignCluster(cluster)}
                            disabled={isAssigned}
                            className={cn(
                              'text-xs',
                              isAssigned 
                                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            )}
                          >
                            {isAssigned ? 'Assigné' : 'Assigner'}
                          </Button>
                          
                          <div 
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer',
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}
                            onClick={() => toggleClusterSelection(cluster.id)}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {clusters.filter(c => !c.linked_user_id).length} cluster{clusters.filter(c => !c.linked_user_id).length > 1 ? 's' : ''} non assigné{clusters.filter(c => !c.linked_user_id).length > 1 ? 's' : ''}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              
              {selectedClusters.length > 0 && (
                <Button
                  onClick={handleMultiAssign}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Assignation...' : `Assigner ${selectedClusters.length} cluster(s)`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && assigningCluster && (
        <AssignModalV2
          facePerson={assigningCluster}
          eventId={eventId}
          onClose={() => {
            setShowAssignModal(false)
            setAssigningCluster(null)
          }}
          onAssigned={() => {
            setShowAssignModal(false)
            setAssigningCluster(null)
            if (onAssigned) onAssigned()
          }}
        />
      )}
    </>
  )
}
