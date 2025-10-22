import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useNotifications(userId: string) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      try {
        setIsLoading(true)
        
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select(`
            id,
            title,
            message,
            type,
            is_read,
            created_at,
            event_id
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (notificationsError) throw notificationsError

        setData(notifications || [])
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching notifications:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [userId])

  return { data, isLoading, error }
}

export function useUnreadNotifications(userId: string) {
  const [data, setData] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnreadCount = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      if (countError) throw countError

      setData(count || 0)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching unread notifications count:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    // Initial fetch
    fetchUnreadCount()

    // Poll every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => clearInterval(interval)
  }, [userId])

  // Expose refetch function
  return { data, isLoading, error, refetch: fetchUnreadCount }
}