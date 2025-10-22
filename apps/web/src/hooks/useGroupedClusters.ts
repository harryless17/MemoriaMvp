'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface GroupedClusters {
  [photoId: string]: {
    photo: any
    clusters: any[]
    personCount: number
  }
}

export function useGroupedClusters(eventId: string) {
  const [groupedClusters, setGroupedClusters] = useState<GroupedClusters>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGroupedClusters()
  }, [eventId])

  const loadGroupedClusters = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all face persons with their representative face media
      const { data: facePersons, error: faceError } = await supabase
        .from('face_persons')
        .select(`
          id,
          event_id,
          linked_user_id,
          cluster_label,
          status,
          metadata,
          representative_face_id,
          representative_face:faces!representative_face_id (
            id,
            media_id,
            media:media (
              id,
              storage_path
            )
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (faceError) throw faceError

      // Group by media_id (photo)
      const grouped: GroupedClusters = {}
      
      console.log('🔍 Face persons data:', facePersons)
      
      facePersons?.forEach(facePerson => {
        // Get the media from the representative face
        const media = facePerson.representative_face?.media
        console.log('🔍 Face person:', facePerson.id, 'Media:', media)
        
        if (!media) {
          console.log('❌ No media found for face person:', facePerson.id)
          return
        }

        const photoId = media.id
        
        if (!grouped[photoId]) {
          grouped[photoId] = {
            photo: media,
            clusters: [],
            personCount: 0
          }
        }

        grouped[photoId].clusters.push(facePerson)
        grouped[photoId].personCount = grouped[photoId].clusters.length
      })
      
      console.log('🔍 Grouped clusters:', grouped)

      setGroupedClusters(grouped)
    } catch (err: any) {
      console.error('Error loading grouped clusters:', err)
      setError(err.message || 'Erreur lors du chargement des clusters')
    } finally {
      setLoading(false)
    }
  }

  const getMultiPersonPhotos = () => {
    return Object.entries(groupedClusters)
      .filter(([_, group]) => group.personCount > 1)
      .map(([photoId, group]) => ({
        photoId,
        ...group
      }))
  }

  const getSinglePersonPhotos = () => {
    return Object.entries(groupedClusters)
      .filter(([_, group]) => group.personCount === 1)
      .map(([photoId, group]) => ({
        photoId,
        ...group
      }))
  }

  return {
    groupedClusters,
    multiPersonPhotos: getMultiPersonPhotos(),
    singlePersonPhotos: getSinglePersonPhotos(),
    loading,
    error,
    refetch: loadGroupedClusters
  }
}
