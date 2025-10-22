import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export function useOptimizedEvents(userId: string) {
  return useQuery({
    queryKey: ['events', userId],
    queryFn: async () => {
      // Fetch events with optimized query
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          date,
          location,
          visibility,
          created_at,
          owner_id,
          profiles!owner_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .or(`owner_id.eq.${userId},event_members.user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return events || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Disable refetch on focus for better UX
  });
}

export function useOptimizedEventMedia(eventId: string) {
  return useQuery({
    queryKey: ['event-media', eventId],
    queryFn: async () => {
      const { data: media, error } = await supabase
        .from('media')
        .select(`
          id,
          event_id,
          user_id,
          type,
          storage_path,
          thumb_path,
          created_at,
          profiles!user_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return media || [];
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes for media (more dynamic)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOptimizedEventMembers(eventId: string) {
  return useQuery({
    queryKey: ['event-members', eventId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('event_members')
        .select(`
          id,
          event_id,
          user_id,
          role,
          joined_at,
          profiles!user_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return members || [];
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
