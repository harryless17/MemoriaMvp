-- Vue SQL pour les médias avec compteurs de likes et commentaires
-- Cette vue est optimisée pour l'affichage dans les feeds

-- Supprimer la vue si elle existe déjà
DROP VIEW IF EXISTS public.media_with_counts;

-- Créer la vue avec les compteurs
CREATE VIEW public.media_with_counts AS
SELECT 
  m.*,
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(c.comment_count, 0) AS comment_count
FROM 
  public.media m
LEFT JOIN (
  SELECT media_id, COUNT(*) AS like_count
  FROM public.likes
  GROUP BY media_id
) l ON m.id = l.media_id
LEFT JOIN (
  SELECT media_id, COUNT(*) AS comment_count
  FROM public.comments
  GROUP BY media_id
) c ON m.id = c.media_id;

-- Grant permissions
GRANT SELECT ON public.media_with_counts TO authenticated, anon;

-- RLS policies (héritées de la table media)
ALTER VIEW public.media_with_counts SET (security_invoker = on);

