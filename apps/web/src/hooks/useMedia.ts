import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Media } from '@memoria/ui';

// Hook pour récupérer les médias d'un événement
export function useEventMedia(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Media[];
    },
    enabled: !!eventId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Hook pour récupérer les médias taggés pour un utilisateur
export function useTaggedMedia(eventId: string, userId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'tagged-media', userId],
    queryFn: async () => {
      // Get member ID
      const { data: memberData } = await supabase
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (!memberData) return [];

      // Get tagged media
      const { data: tags } = await supabase
        .from('media_tags')
        .select('media_id')
        .eq('member_id', (memberData as any).id);

      const mediaIds = tags?.map((t: any) => t.media_id) || [];
      if (mediaIds.length === 0) return [];

      const { data: media, error } = await supabase
        .from('media')
        .select('*')
        .in('id', mediaIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return media as Media[];
    },
    enabled: !!eventId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook pour uploader un média
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, eventId, type }: { file: File; eventId: string; type: 'photo' | 'video' }) => {
      // Upload logic here (simplified)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${eventId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create media record
      const { data, error } = await (supabase.from('media') as any).insert({
        event_id: eventId,
        uploader_id: user.id,
        storage_path: fileName,
        type,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalider le cache des médias de cet événement
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId, 'media'] });
    },
  });
}

