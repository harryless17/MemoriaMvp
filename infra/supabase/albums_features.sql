-- ============================================
-- ALBUMS - FONCTIONNALITÉS AVANCÉES
-- ============================================

-- Fonction immutable pour extraire la date (UTC)
CREATE OR REPLACE FUNCTION date_immutable(ts TIMESTAMPTZ)
RETURNS DATE AS $$
  SELECT ts::DATE;
$$ LANGUAGE SQL IMMUTABLE;

-- Table pour les vues d'albums
CREATE TABLE IF NOT EXISTS public.album_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_album_views_album_id ON public.album_views(album_id);
CREATE INDEX idx_album_views_viewed_at ON public.album_views(viewed_at);

-- Index unique pour éviter les vues multiples le même jour (1 vue par user par jour)
CREATE UNIQUE INDEX IF NOT EXISTS idx_album_views_unique_daily 
ON public.album_views(album_id, user_id, date_immutable(viewed_at))
WHERE user_id IS NOT NULL;

-- Table pour les collaborateurs d'albums
CREATE TABLE IF NOT EXISTS public.album_collaborators (
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (album_id, user_id)
);

CREATE INDEX idx_album_collaborators_user ON public.album_collaborators(user_id);
CREATE INDEX idx_album_collaborators_album ON public.album_collaborators(album_id);

-- Table pour les commentaires sur albums
CREATE TABLE IF NOT EXISTS public.album_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_album_comments_album ON public.album_comments(album_id);
CREATE INDEX idx_album_comments_user ON public.album_comments(user_id);
CREATE INDEX idx_album_comments_created ON public.album_comments(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_album_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_album_comments_updated_at
  BEFORE UPDATE ON public.album_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_album_comments_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Album Views (public peuvent voir leurs propres vues)
ALTER TABLE public.album_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "album_views_select_all"
ON public.album_views FOR SELECT
USING (true);

CREATE POLICY "album_views_insert_auth"
ON public.album_views FOR INSERT
WITH CHECK (true);

-- Album Collaborators
ALTER TABLE public.album_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collaborators_select_all"
ON public.album_collaborators FOR SELECT
USING (true);

CREATE POLICY "collaborators_insert_owner"
ON public.album_collaborators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.albums
    WHERE albums.id = album_collaborators.album_id
    AND albums.user_id = auth.uid()
  )
);

CREATE POLICY "collaborators_delete_owner"
ON public.album_collaborators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.albums
    WHERE albums.id = album_collaborators.album_id
    AND albums.user_id = auth.uid()
  )
);

-- Album Comments
ALTER TABLE public.album_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "album_comments_select_all"
ON public.album_comments FOR SELECT
USING (true);

CREATE POLICY "album_comments_insert_auth"
ON public.album_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "album_comments_update_own"
ON public.album_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "album_comments_delete_own"
ON public.album_comments FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour compter les vues d'un album
CREATE OR REPLACE FUNCTION get_album_views_count(album_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER
  FROM public.album_views
  WHERE album_id = album_uuid;
$$ LANGUAGE SQL STABLE;

-- Fonction pour vérifier si un utilisateur est collaborateur
CREATE OR REPLACE FUNCTION is_album_collaborator(album_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_collaborators
    WHERE album_id = album_uuid
    AND user_id = user_uuid
  );
$$ LANGUAGE SQL STABLE;

