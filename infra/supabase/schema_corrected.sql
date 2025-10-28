-- =====================================================
-- MEMORIA DATABASE SCHEMA - CORRECTED FOR SUPABASE
-- =====================================================
-- This file creates all necessary tables for the Memoria application
-- Run this first to create all tables and basic structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- 1. PROFILES TABLE (1:1 with auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ,
  location TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  face_recognition_enabled BOOLEAN DEFAULT false,
  face_recognition_enabled_at TIMESTAMPTZ,
  face_recognition_consent_version INT DEFAULT 1,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. EVENT MEMBERS TABLE (replaces event_attendees)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'co-organizer', 'participant')),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. MEDIA TABLE (photos/videos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. MEDIA TAGS TABLE (CORE - tagging system)
-- =====================================================
CREATE TYPE tag_source AS ENUM ('manual', 'face_clustering', 'imported', 'suggested');

CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.event_members(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  source tag_source DEFAULT 'manual',
  bbox JSONB,
  face_id UUID, -- Will reference faces table when face clustering is enabled
  UNIQUE(media_id, member_id)
);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tagged_in_media', 'added_to_event', 'invitation_sent', 'new_photos')),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. FACE CLUSTERING TABLES (ML System)
-- =====================================================

-- ML Jobs Queue
CREATE TYPE job_type AS ENUM ('detect', 'cluster');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_priority AS ENUM ('high', 'normal', 'low');

CREATE TABLE IF NOT EXISTS public.ml_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type job_type NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_ids UUID[],
  status job_status DEFAULT 'pending',
  priority job_priority DEFAULT 'normal',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Face Persons (Clusters)
CREATE TYPE face_person_status AS ENUM ('pending', 'linked', 'invited', 'ignored', 'merged');

CREATE TABLE IF NOT EXISTS public.face_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  cluster_label INT NOT NULL,
  representative_face_id UUID,
  linked_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status face_person_status DEFAULT 'pending',
  invitation_email TEXT,
  invited_at TIMESTAMPTZ,
  merged_into_id UUID REFERENCES public.face_persons(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES public.profiles(id),
  CONSTRAINT unique_event_cluster UNIQUE(event_id, cluster_label)
);

-- Faces (Detected faces with embeddings)
CREATE TABLE IF NOT EXISTS public.faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  face_person_id UUID REFERENCES public.face_persons(id) ON DELETE SET NULL,
  bbox JSONB NOT NULL,
  embedding vector(512),
  quality_score FLOAT,
  landmarks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bbox_format CHECK (
    jsonb_typeof(bbox) = 'object' AND
    bbox ? 'x' AND bbox ? 'y' AND bbox ? 'w' AND bbox ? 'h'
  )
);

-- Add foreign key constraint for representative_face_id
ALTER TABLE public.face_persons
  ADD CONSTRAINT fk_representative_face
  FOREIGN KEY (representative_face_id) REFERENCES public.faces(id) ON DELETE SET NULL;

-- Add foreign key constraint for face_id in media_tags
ALTER TABLE public.media_tags
  ADD CONSTRAINT fk_face_id
  FOREIGN KEY (face_id) REFERENCES public.faces(id) ON DELETE SET NULL;

-- =====================================================
-- 8. MEDIA VIEWS TABLE (for analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.media_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_viewer CHECK (viewer_id IS NOT NULL OR viewer_ip IS NOT NULL)
);

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility_created ON public.events(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_face_recognition ON public.events(face_recognition_enabled);

-- Event members indexes
CREATE INDEX IF NOT EXISTS idx_event_members_event ON public.event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_email ON public.event_members(email);
CREATE INDEX IF NOT EXISTS idx_event_members_token ON public.event_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_event_members_role ON public.event_members(event_id, role);

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_media_event ON public.media(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_user ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media(type);

-- Media tags indexes
CREATE INDEX IF NOT EXISTS idx_media_tags_media ON public.media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_member ON public.media_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tagged_by ON public.media_tags(tagged_by);
CREATE INDEX IF NOT EXISTS idx_media_tags_source ON public.media_tags(source);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ML Jobs indexes
CREATE INDEX IF NOT EXISTS idx_ml_jobs_queue ON public.ml_jobs(status, priority, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ml_jobs_event ON public.ml_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_ml_jobs_status ON public.ml_jobs(status);

-- Face persons indexes
CREATE INDEX IF NOT EXISTS idx_face_persons_event ON public.face_persons(event_id);
CREATE INDEX IF NOT EXISTS idx_face_persons_status ON public.face_persons(status);
CREATE INDEX IF NOT EXISTS idx_face_persons_user ON public.face_persons(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- Faces indexes
CREATE INDEX IF NOT EXISTS idx_faces_media ON public.faces(media_id);
CREATE INDEX IF NOT EXISTS idx_faces_event ON public.faces(event_id);
CREATE INDEX IF NOT EXISTS idx_faces_person ON public.faces(face_person_id) WHERE face_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faces_quality ON public.faces(quality_score DESC);

-- Vector index for face similarity search
CREATE INDEX IF NOT EXISTS idx_faces_embedding ON public.faces 
  USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);

-- Media views indexes
CREATE INDEX IF NOT EXISTS idx_media_views_media_id ON public.media_views(media_id);
CREATE INDEX IF NOT EXISTS idx_media_views_viewer_id ON public.media_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_media_views_viewed_at ON public.media_views(viewed_at);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment job attempts
CREATE OR REPLACE FUNCTION increment_job_attempts(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ml_jobs 
  SET attempts = attempts + 1,
      updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get face person stats
CREATE OR REPLACE FUNCTION get_face_person_stats(person_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'face_count', COUNT(*)::int,
    'avg_quality', ROUND(AVG(quality_score)::numeric, 2),
    'media_count', COUNT(DISTINCT media_id)::int
  )
  FROM public.faces
  WHERE face_person_id = person_id;
$$ LANGUAGE SQL STABLE;

-- Function to count unique media views
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

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Auto-update triggers
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ml_jobs_updated_at
  BEFORE UPDATE ON public.ml_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER face_persons_updated_at
  BEFORE UPDATE ON public.face_persons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 12. VIEWS FOR EASY QUERYING
-- =====================================================

-- Face persons with stats
CREATE OR REPLACE VIEW public.face_persons_with_stats AS
SELECT 
  fp.*,
  COUNT(f.id) as face_count,
  AVG(f.quality_score) as avg_quality,
  COUNT(DISTINCT f.media_id) as media_count,
  p.display_name as linked_user_name,
  p.avatar_url as linked_user_avatar
FROM public.face_persons fp
LEFT JOIN public.faces f ON f.face_person_id = fp.id
LEFT JOIN public.profiles p ON p.id = fp.linked_user_id
GROUP BY fp.id, p.display_name, p.avatar_url;

-- Media with face tags
CREATE OR REPLACE VIEW public.media_with_face_tags AS
SELECT 
  m.*,
  jsonb_agg(
    jsonb_build_object(
      'tag_id', mt.id,
      'member_id', mt.member_id,
      'user_id', em.user_id,
      'user_name', p.display_name,
      'user_avatar', p.avatar_url,
      'bbox', mt.bbox,
      'source', mt.source
    )
  ) FILTER (WHERE mt.id IS NOT NULL) as tags
FROM public.media m
LEFT JOIN public.media_tags mt ON mt.media_id = m.id
LEFT JOIN public.event_members em ON em.id = mt.member_id
LEFT JOIN public.profiles p ON p.id = em.user_id
GROUP BY m.id;

-- Event stats view
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

-- =====================================================
-- 13. COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles with extended information';
COMMENT ON TABLE public.events IS 'Events created by users';
COMMENT ON TABLE public.event_members IS 'Members of events (replaces event_attendees)';
COMMENT ON TABLE public.media IS 'Photos and videos uploaded to events';
COMMENT ON TABLE public.media_tags IS 'Tags linking people to media';
COMMENT ON TABLE public.notifications IS 'User notifications';
COMMENT ON TABLE public.ml_jobs IS 'Queue for ML processing jobs';
COMMENT ON TABLE public.face_persons IS 'Clusters of faces representing individual persons';
COMMENT ON TABLE public.faces IS 'Individual detected faces with embeddings';
COMMENT ON TABLE public.media_views IS 'Analytics for media views';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Schema setup completed successfully!' AS status;
