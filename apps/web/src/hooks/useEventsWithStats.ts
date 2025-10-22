import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export function useEventsWithStats(userId: string) {
  return useQuery({
    queryKey: ['events', 'with-stats', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Load all events where user is a member
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('event_members')
        .select('event_id, role')
        .eq('user_id', userId);

      if (membershipsError) throw membershipsError;
      if (!membershipsData || membershipsData.length === 0) return [];

      const eventIds = membershipsData.map((m: any) => m.event_id);
      const rolesMap = new Map(membershipsData.map((m: any) => [m.event_id, m.role]));

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Load stats for each event in parallel
      const eventsWithStats = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          const myRole = rolesMap.get(event.id);

          const [memberCountResult, mediaCountResult] = await Promise.all([
            // Count members
            supabase
              .from('event_members')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id),
            
            // Count total media
            supabase
              .from('media')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id),
          ]);

          let myMediaCount = 0;
          let untaggedCount = 0;

          if (myRole === 'participant') {
            // Count my tagged media
            const { data: myMemberData } = await supabase
              .from('event_members')
              .select('id')
              .eq('event_id', event.id)
              .eq('user_id', userId)
              .single();

            if (myMemberData) {
              const { count } = await supabase
                .from('media_tags')
                .select('*', { count: 'exact', head: true })
                .eq('member_id', (myMemberData as any).id);
              myMediaCount = count || 0;
            }
          } else {
            // Count untagged media for organizers
            const { data: allMedia } = await supabase
              .from('media')
              .select('id')
              .eq('event_id', event.id);

            if (allMedia && allMedia.length > 0) {
              // Get all tagged media IDs
              const mediaIds = allMedia.map((m: any) => m.id);
              const { data: taggedMedia } = await supabase
                .from('media_tags')
                .select('media_id')
                .in('media_id', mediaIds);

              const taggedMediaIds = new Set(taggedMedia?.map((t: any) => t.media_id) || []);
              untaggedCount = mediaIds.filter(id => !taggedMediaIds.has(id)).length;
            }
          }

          return {
            ...event,
            my_role: myRole,
            member_count: memberCountResult.count || 0,
            media_count: mediaCountResult.count || 0,
            my_media_count: myMediaCount,
            untagged_count: untaggedCount,
          };
        })
      );

      return eventsWithStats;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

