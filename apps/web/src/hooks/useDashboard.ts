import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useDashboardStats(userId: string) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function fetchStats() {
      try {
        setIsLoading(true)
        
        // Fetch events count
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id')
          .eq('owner_id', userId)
        
        if (eventsError) throw eventsError

        // Fetch media count
        const { data: media, error: mediaError } = await supabase
          .from('media')
          .select('id')
          .eq('user_id', userId)
        
        if (mediaError) throw mediaError

        // Fetch tagged count - need to join with event_members
        const { data: myMemberships } = await supabase
          .from('event_members')
          .select('id')
          .eq('user_id', userId)
        
        const memberIds = myMemberships?.map((m: any) => m.id) || []
        
        let taggedCount = 0
        if (memberIds.length > 0) {
          const { count } = await supabase
            .from('media_tags')
            .select('*', { count: 'exact', head: true })
            .in('member_id', memberIds)
          
          taggedCount = count || 0
        }

        // Fetch unread notifications
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('is_read', false)
        
        if (notifError) throw notifError

        setData({
          eventsCount: events?.length || 0,
          mediaCount: media?.length || 0,
          taggedCount: taggedCount,
          unreadNotifications: notifications?.length || 0
        })
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  return { data, isLoading, error }
}

export function useRecentEvents(userId: string, limit: number = 4) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function fetchEvents() {
      try {
        setIsLoading(true)
        
        // Get events where user is owner
        const { data: ownedEvents, error: ownedError } = await supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            created_at,
            date,
            location,
            owner_id
          `)
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (ownedError) throw ownedError

        // Get events where user is a member
        const { data: memberEvents, error: memberError } = await supabase
          .from('event_members')
          .select(`
            id,
            event_id,
            role,
            event:events(
              id,
              title,
              description,
              created_at,
              date,
              location,
              owner_id
            )
          `)
          .eq('user_id', userId)
        
        if (memberError) throw memberError

        // Combine and deduplicate events
        const eventsMap = new Map()
        
        // Add owned events and fetch first media for each
        for (const event of (ownedEvents || [])) {
          // Get first media for thumbnail
          const { data: firstMedia } = await supabase
            .from('media')
            .select('storage_path, type')
            .eq('event_id', event.id)
            .eq('type', 'photo')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          eventsMap.set(event.id, {
            ...event,
            myRole: 'owner',
            mediaCount: 0,
            taggedCount: 0,
            membersCount: 0,
            firstMediaPath: firstMedia?.storage_path || null
          })
        }
        
        // Add member events and calculate their stats
        for (const membership of (memberEvents || [])) {
          if (membership.event) {
            const event = membership.event
            
            // Get first media for thumbnail
            const { data: firstMedia } = await supabase
              .from('media')
              .select('storage_path, type')
              .eq('event_id', event.id)
              .eq('type', 'photo')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            // Calculate media count for this event
            const { count: mediaCount } = await supabase
              .from('media')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
            
            // Calculate tagged count for this user in this event
            const { count: taggedCount } = await supabase
              .from('media_tags')
              .select('*', { count: 'exact', head: true })
              .eq('member_id', membership.id)
            
            eventsMap.set(event.id, {
              ...event,
              myRole: event.owner_id === userId ? 'owner' : membership.role,
              mediaCount: mediaCount || 0,
              taggedCount: taggedCount || 0,
              membersCount: 0,
              firstMediaPath: firstMedia?.storage_path || null
            })
          }
        }
        
        // Convert to array and sort by created_at
        const transformedEvents = Array.from(eventsMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)

        console.log('📊 useRecentEvents:', {
          ownedEventsCount: ownedEvents?.length || 0,
          memberEventsCount: memberEvents?.length || 0,
          totalUniqueEvents: eventsMap.size,
          transformedEventsCount: transformedEvents.length
        })

        setData(transformedEvents)
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching recent events:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [userId, limit])

  return { data, isLoading, error }
}