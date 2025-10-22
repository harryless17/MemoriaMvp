import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook pour tracker automatiquement la vue d'un média
 * Enregistre la vue une seule fois par session
 */
export function useMediaView(mediaId: string | null) {
  const hasViewed = useRef(false);

  useEffect(() => {
    if (!mediaId || hasViewed.current) return;

    async function trackView() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Enregistrer la vue
        await (supabase.from('media_views') as any).insert({
          media_id: mediaId,
          viewer_id: user?.id || null,
          viewer_ip: null, // Le backend Supabase peut remplir ça si configuré
        });

        hasViewed.current = true;
      } catch (error) {
        // Silently fail - tracking des vues n'est pas critique
        console.debug('View tracking failed:', error);
      }
    }

    // Délai de 2 secondes avant de compter comme une vue
    // (évite de compter les scrolls rapides)
    const timer = setTimeout(() => {
      trackView();
    }, 2000);

    return () => clearTimeout(timer);
  }, [mediaId]);
}
