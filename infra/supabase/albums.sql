-- ============================================
-- ALBUMS PERSONNALISÉS
-- ============================================

-- Table albums
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de liaison album_media
CREATE TABLE IF NOT EXISTS public.album_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, media_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_event_id ON public.albums(event_id);
CREATE INDEX IF NOT EXISTS idx_album_media_album_id ON public.album_media(album_id);
CREATE INDEX IF NOT EXISTS idx_album_media_media_id ON public.album_media(media_id);

-- RLS Policies pour albums
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_select_all" ON public.albums;
CREATE POLICY "albums_select_all"
ON public.albums FOR SELECT
USING (
  visibility = 'public' 
  OR 
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.album_collaborators
    WHERE album_collaborators.album_id = albums.id
    AND album_collaborators.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "albums_insert_own" ON public.albums;
CREATE POLICY "albums_insert_own"
ON public.albums FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_update_own" ON public.albums;
CREATE POLICY "albums_update_own"
ON public.albums FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_delete_own" ON public.albums;
CREATE POLICY "albums_delete_own"
ON public.albums FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies pour album_media
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "album_media_select_all" ON public.album_media;
CREATE POLICY "album_media_select_all"
ON public.album_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "album_media_insert_own" ON public.album_media;
CREATE POLICY "album_media_insert_own"
ON public.album_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = album_media.album_id 
    AND albums.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "album_media_delete_own" ON public.album_media;
CREATE POLICY "album_media_delete_own"
ON public.album_media FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = album_media.album_id 
    AND albums.user_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour albums
DROP TRIGGER IF EXISTS update_albums_updated_at ON public.albums;
CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
