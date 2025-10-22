-- ============================================
-- TRACKING DES VUES DE MÉDIAS
-- ============================================

-- Table media_views
CREATE TABLE IF NOT EXISTS public.media_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un utilisateur peut voir un média plusieurs fois, pas de UNIQUE
  CONSTRAINT valid_viewer CHECK (viewer_id IS NOT NULL OR viewer_ip IS NOT NULL)
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_media_views_media_id ON public.media_views(media_id);
CREATE INDEX IF NOT EXISTS idx_media_views_viewer_id ON public.media_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_media_views_viewed_at ON public.media_views(viewed_at);

-- RLS Policies
ALTER TABLE public.media_views ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les stats de vues
DROP POLICY IF EXISTS "media_views_select_all" ON public.media_views;
CREATE POLICY "media_views_select_all"
ON public.media_views FOR SELECT
USING (true);

-- N'importe qui peut enregistrer une vue (même anonyme)
DROP POLICY IF EXISTS "media_views_insert_all" ON public.media_views;
CREATE POLICY "media_views_insert_all"
ON public.media_views FOR INSERT
WITH CHECK (true);

-- Fonction pour compter les vues uniques (par user_id ou ip)
CREATE OR REPLACE FUNCTION count_unique_media_views(p_media_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT COALESCE(viewer_id::TEXT, viewer_ip))
    FROM public.media_views
    WHERE media_id = p_media_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue matérialisée pour les stats rapides (optionnel, pour optimisation)
CREATE MATERIALIZED VIEW IF NOT EXISTS media_view_counts AS
SELECT 
  media_id,
  COUNT(*) as total_views,
  COUNT(DISTINCT COALESCE(viewer_id::TEXT, viewer_ip)) as unique_views
FROM public.media_views
GROUP BY media_id;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_view_counts_media_id 
ON media_view_counts(media_id);

-- Fonction pour rafraîchir la vue (à appeler périodiquement ou après beaucoup d'insertions)
CREATE OR REPLACE FUNCTION refresh_media_view_counts()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY media_view_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
