import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@memoria/ui';

// Hook pour récupérer les événements de l'utilisateur
export function useUserEvents() {
  return useQuery({
    queryKey: ['events', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get events where I'm a member
      const { data: memberData, error: memberError } = await supabase
        .from('event_members')
        .select('event_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const eventIds = memberData?.map((m: any) => m.event_id) || [];
      if (eventIds.length === 0) return [];

      // Get full event details
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Merge with role info
      return (events || []).map((event: any) => ({
        ...event,
        myRole: (memberData as any)?.find((m: any) => m.event_id === event.id)?.role,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer un événement spécifique
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data as Event;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer les membres d'un événement
export function useEventMembers(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('event_id', eventId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Hook pour créer un événement
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const { data, error } = await (supabase.from('events') as any).insert(eventData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalider le cache des événements pour forcer un refresh
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

