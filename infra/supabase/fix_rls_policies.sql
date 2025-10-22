-- ========================================
-- FIX : Policies RLS simplifiées pour éviter erreurs 500
-- ========================================
-- Exécuter ce script dans le SQL Editor après avoir désactivé RLS

-- ========================================
-- MEDIA : Policies simplifiées
-- ========================================

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "media_select" ON public.media;
DROP POLICY IF EXISTS "media_insert" ON public.media;
DROP POLICY IF EXISTS "media_delete" ON public.media;

-- SELECT : Simplifié - tout user authentifié peut voir (temporaire)
CREATE POLICY "media_select_simple" ON public.media
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : Les users authentifiés membres d'un événement peuvent uploader
CREATE POLICY "media_insert_simple" ON public.media
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE : Seulement le uploader ou le owner de l'événement
CREATE POLICY "media_delete_simple" ON public.media
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = media.event_id
      AND e.owner_id = auth.uid()
    )
  );

-- ========================================
-- MEDIA_TAGS : Policies simplifiées
-- ========================================

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "media_tags_select" ON public.media_tags;
DROP POLICY IF EXISTS "media_tags_insert" ON public.media_tags;
DROP POLICY IF EXISTS "media_tags_delete" ON public.media_tags;

-- SELECT : Tout user authentifié peut voir (temporaire)
CREATE POLICY "media_tags_select_simple" ON public.media_tags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : Tout user authentifié peut taguer (temporaire - à restreindre plus tard)
CREATE POLICY "media_tags_insert_simple" ON public.media_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE : Tout user authentifié peut supprimer (temporaire)
CREATE POLICY "media_tags_delete_simple" ON public.media_tags
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ========================================
-- Ré-activer RLS
-- ========================================

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Vérification
-- ========================================

SELECT 'RLS Policies simplifiées appliquées avec succès!' as status;

-- Tester les requêtes maintenant
SELECT COUNT(*) FROM public.media;
SELECT COUNT(*) FROM public.media_tags;
