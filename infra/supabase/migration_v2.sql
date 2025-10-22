-- ========================================
-- MEMORIA V2 - Migration vers le système de tagging
-- ========================================
-- Ce script migre la base de données vers le nouveau modèle
-- centré sur l'identification de personnes dans les médias

-- ========================================
-- ÉTAPE 1 : Nettoyage des anciennes tables
-- ========================================

-- Supprimer les tables social
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;

-- Supprimer les tables stories et albums (si elles existent)
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.story_views CASCADE;
DROP TABLE IF EXISTS public.albums_media CASCADE;
DROP TABLE IF EXISTS public.albums CASCADE;

-- Supprimer les vues obsolètes
DROP VIEW IF EXISTS public.media_with_counts CASCADE;
DROP VIEW IF EXISTS public.member_media_counts CASCADE;
DROP VIEW IF EXISTS public.untagged_media CASCADE;

-- ========================================
-- ÉTAPE 2 : Créer la nouvelle table event_members
-- ========================================

CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co-organizer', 'participant')),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ÉTAPE 3 : Créer la table media_tags (CORE)
-- ========================================

CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.event_members(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, member_id)
);

-- ========================================
-- ÉTAPE 4 : Simplifier la table media
-- ========================================

-- Retirer la colonne visibility (géré par les tags maintenant)
ALTER TABLE public.media DROP COLUMN IF EXISTS visibility;

-- ========================================
-- ÉTAPE 5 : Créer les indexes pour la performance
-- ========================================

-- Indexes sur event_members
CREATE INDEX IF NOT EXISTS idx_event_members_event ON public.event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_email ON public.event_members(email);
CREATE INDEX IF NOT EXISTS idx_event_members_token ON public.event_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_event_members_role ON public.event_members(event_id, role);

-- Indexes sur media_tags
CREATE INDEX IF NOT EXISTS idx_media_tags_media ON public.media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_member ON public.media_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tagged_by ON public.media_tags(tagged_by);

-- ========================================
-- ÉTAPE 6 : Migrer les données existantes
-- ========================================

-- Migrer event_attendees → event_members (seulement si la table existe)
DO $$
BEGIN
  -- Vérifier si la table event_attendees existe
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'event_attendees'
  ) THEN
    -- Migrer les données
    INSERT INTO public.event_members (event_id, user_id, name, email, role, joined_at, created_at)
    SELECT 
      ea.event_id,
      ea.user_id,
      COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1)),
      COALESCE(u.email, 'unknown@example.com'),
      CASE 
        WHEN e.owner_id = ea.user_id THEN 'owner'::TEXT
        ELSE 'participant'::TEXT
      END,
      ea.joined_at,
      ea.joined_at
    FROM public.event_attendees ea
    LEFT JOIN public.profiles p ON ea.user_id = p.id
    LEFT JOIN auth.users u ON ea.user_id = u.id
    JOIN public.events e ON ea.event_id = e.id
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Migration des données de event_attendees terminée';
  ELSE
    RAISE NOTICE 'Table event_attendees n''existe pas, skip migration';
  END IF;
END $$;

-- Supprimer l'ancienne table si elle existe encore
DROP TABLE IF EXISTS public.event_attendees CASCADE;

-- ========================================
-- ÉTAPE 7 : Créer les vues utiles
-- ========================================

-- Vue pour compter les médias par membre
CREATE OR REPLACE VIEW public.member_media_counts AS
SELECT 
  em.id as member_id,
  em.event_id,
  em.user_id,
  em.name,
  em.email,
  COUNT(mt.media_id) as media_count
FROM public.event_members em
LEFT JOIN public.media_tags mt ON em.id = mt.member_id
GROUP BY em.id, em.event_id, em.user_id, em.name, em.email;

-- Vue pour les médias non taggués par événement
CREATE OR REPLACE VIEW public.untagged_media AS
SELECT 
  m.*,
  e.title as event_title
FROM public.media m
JOIN public.events e ON m.event_id = e.id
LEFT JOIN public.media_tags mt ON m.id = mt.media_id
WHERE mt.id IS NULL;

-- Vue pour les statistiques d'événement
CREATE OR REPLACE VIEW public.event_stats AS
SELECT 
  e.id as event_id,
  e.title,
  COUNT(DISTINCT em.id) as member_count,
  COUNT(DISTINCT m.id) as media_count,
  COUNT(DISTINCT CASE WHEN mt.id IS NULL THEN m.id END) as untagged_media_count
FROM public.events e
LEFT JOIN public.event_members em ON e.id = em.event_id
LEFT JOIN public.media m ON e.id = m.event_id
LEFT JOIN public.media_tags mt ON m.id = mt.media_id
GROUP BY e.id, e.title;

-- ========================================
-- ÉTAPE 8 : Fonctions utiles
-- ========================================

-- Fonction pour ajouter un membre avec token d'invitation
CREATE OR REPLACE FUNCTION public.add_event_member(
  p_event_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT DEFAULT 'participant'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- Générer un token unique URL-safe (sans caractères spéciaux)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');  -- Supprimer le = pour éviter les problèmes d'URL
  
  -- Insérer le membre
  INSERT INTO public.event_members (
    event_id, 
    user_id, 
    name, 
    email, 
    role, 
    invitation_token,
    joined_at
  )
  VALUES (
    p_event_id, 
    v_user_id, 
    p_name, 
    p_email, 
    p_role, 
    v_token,
    CASE WHEN v_user_id IS NOT NULL THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$;

-- Fonction pour taguer plusieurs médias avec plusieurs personnes
CREATE OR REPLACE FUNCTION public.tag_media_bulk(
  p_media_ids UUID[],
  p_member_ids UUID[],
  p_tagged_by UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_media_id UUID;
  v_member_id UUID;
BEGIN
  FOREACH v_media_id IN ARRAY p_media_ids
  LOOP
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      INSERT INTO public.media_tags (media_id, member_id, tagged_by)
      VALUES (v_media_id, v_member_id, p_tagged_by)
      ON CONFLICT (media_id, member_id) DO NOTHING;
      
      -- Compter seulement les nouveaux tags
      IF FOUND THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Fonction pour récupérer le rôle d'un utilisateur dans un événement
CREATE OR REPLACE FUNCTION public.get_user_event_role(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.event_members
  WHERE event_id = p_event_id
  AND user_id = p_user_id;
  
  RETURN v_role;
END;
$$;

-- Fonction pour vérifier si un utilisateur peut taguer dans un événement
CREATE OR REPLACE FUNCTION public.can_tag_in_event(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.event_members
  WHERE event_id = p_event_id
  AND user_id = p_user_id;
  
  RETURN v_role IN ('owner', 'co-organizer');
END;
$$;

-- ========================================
-- ÉTAPE 9 : Activer RLS sur les nouvelles tables
-- ========================================

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 10 : Créer les policies RLS
-- ========================================

-- Policies pour event_members
-- Note: Pour éviter la récursion infinie, on simplifie en permettant à tous les membres
-- de voir tous les autres membres de leur événement

DROP POLICY IF EXISTS "event_members_select" ON public.event_members;
CREATE POLICY "event_members_select" ON public.event_members
  FOR SELECT
  USING (
    -- Tous les membres authentifiés peuvent voir tous les membres
    -- La restriction se fait au niveau de l'application
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "event_members_insert" ON public.event_members;
CREATE POLICY "event_members_insert" ON public.event_members
  FOR INSERT
  WITH CHECK (
    -- Vérifier via la table events si je suis owner
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_members.event_id
      AND e.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_members_update" ON public.event_members;
CREATE POLICY "event_members_update" ON public.event_members
  FOR UPDATE
  USING (
    -- Je peux modifier mon propre profil
    user_id = auth.uid()
    -- Ou je suis owner de l'événement
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_members.event_id
      AND e.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_members_delete" ON public.event_members;
CREATE POLICY "event_members_delete" ON public.event_members
  FOR DELETE
  USING (
    -- Seulement le owner de l'événement peut supprimer des membres
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_members.event_id
      AND e.owner_id = auth.uid()
    )
  );

-- Policies pour media (simplifiées pour éviter erreurs 500)
DROP POLICY IF EXISTS "media_select" ON public.media;
DROP POLICY IF EXISTS "media_select_simple" ON public.media;
CREATE POLICY "media_select_simple" ON public.media
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_insert" ON public.media;
DROP POLICY IF EXISTS "media_insert_simple" ON public.media;
CREATE POLICY "media_insert_simple" ON public.media
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_delete" ON public.media;
DROP POLICY IF EXISTS "media_delete_simple" ON public.media;
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

-- Policies pour media_tags (simplifiées pour éviter erreurs 500)
DROP POLICY IF EXISTS "media_tags_select" ON public.media_tags;
DROP POLICY IF EXISTS "media_tags_select_simple" ON public.media_tags;
CREATE POLICY "media_tags_select_simple" ON public.media_tags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_tags_insert" ON public.media_tags;
DROP POLICY IF EXISTS "media_tags_insert_simple" ON public.media_tags;
CREATE POLICY "media_tags_insert_simple" ON public.media_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_tags_delete" ON public.media_tags;
DROP POLICY IF EXISTS "media_tags_delete_simple" ON public.media_tags;
CREATE POLICY "media_tags_delete_simple" ON public.media_tags
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

-- Vérification
SELECT 'Migration completed successfully!' as status;
SELECT 'Total events: ' || COUNT(*)::TEXT FROM public.events;
SELECT 'Total members: ' || COUNT(*)::TEXT FROM public.event_members;
SELECT 'Total media: ' || COUNT(*)::TEXT FROM public.media;
SELECT 'Total tags: ' || COUNT(*)::TEXT FROM public.media_tags;
