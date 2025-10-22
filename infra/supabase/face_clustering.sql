-- =====================================================
-- FACE CLUSTERING & TAGGING SCHEMA
-- =====================================================
-- InsightFace + HDBSCAN based face recognition system
-- Scope: per-event clustering with GDPR compliance
-- =====================================================

-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 0. HELPER FUNCTIONS (shared)
-- =====================================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment job attempts (used by worker on retry)
CREATE OR REPLACE FUNCTION increment_job_attempts(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ml_jobs 
  SET attempts = attempts + 1,
      updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. ML JOBS QUEUE
-- =====================================================
CREATE TYPE job_type AS ENUM ('detect', 'cluster');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_priority AS ENUM ('high', 'normal', 'low');

CREATE TABLE ml_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type job_type NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_ids UUID[], -- batch of media_ids for 'detect' job
  status job_status DEFAULT 'pending',
  priority job_priority DEFAULT 'normal',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error TEXT,
  result JSONB, -- job output data
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient job queue polling
CREATE INDEX idx_ml_jobs_queue ON ml_jobs(status, priority, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_ml_jobs_event ON ml_jobs(event_id);
CREATE INDEX idx_ml_jobs_status ON ml_jobs(status);

-- Auto-update updated_at
CREATE TRIGGER ml_jobs_updated_at
  BEFORE UPDATE ON ml_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 2. FACE PERSONS (Clusters)
-- =====================================================
CREATE TYPE face_person_status AS ENUM ('pending', 'linked', 'invited', 'ignored', 'merged');

CREATE TABLE face_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cluster_label INT NOT NULL, -- HDBSCAN output label (-1 = noise)
  representative_face_id UUID, -- best quality face for thumbnail (FK added later)
  linked_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status face_person_status DEFAULT 'pending',
  invitation_email TEXT,
  invited_at TIMESTAMPTZ,
  merged_into_id UUID REFERENCES face_persons(id) ON DELETE SET NULL, -- if merged
  metadata JSONB DEFAULT '{}'::jsonb, -- {face_count, avg_quality, manual_edits, etc}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES profiles(id),
  CONSTRAINT unique_event_cluster UNIQUE(event_id, cluster_label)
);

CREATE INDEX idx_face_persons_event ON face_persons(event_id);
CREATE INDEX idx_face_persons_status ON face_persons(status);
CREATE INDEX idx_face_persons_user ON face_persons(linked_user_id) WHERE linked_user_id IS NOT NULL;

CREATE TRIGGER face_persons_updated_at
  BEFORE UPDATE ON face_persons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 3. FACES (Detected faces with embeddings)
-- =====================================================
CREATE TABLE faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  face_person_id UUID REFERENCES face_persons(id) ON DELETE SET NULL,
  bbox JSONB NOT NULL, -- {x, y, w, h} normalized [0-1]
  embedding vector(512), -- buffalo_l generates 512-dimensional embeddings
  quality_score FLOAT, -- detection confidence [0-1]
  landmarks JSONB, -- optional: {left_eye, right_eye, nose, mouth_left, mouth_right}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bbox_format CHECK (
    jsonb_typeof(bbox) = 'object' AND
    bbox ? 'x' AND bbox ? 'y' AND bbox ? 'w' AND bbox ? 'h'
  )
);

CREATE INDEX idx_faces_media ON faces(media_id);
CREATE INDEX idx_faces_event ON faces(event_id);
CREATE INDEX idx_faces_person ON faces(face_person_id) WHERE face_person_id IS NOT NULL;
CREATE INDEX idx_faces_quality ON faces(quality_score DESC);

-- Vector index for similarity search (IVFFlat for reasonable performance)
-- Note: Requires enough data to be useful (100+ embeddings recommended)
-- Adjust 'lists' parameter based on expected dataset size
CREATE INDEX idx_faces_embedding ON faces 
  USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);

-- Now we can add the FK constraint for representative_face_id
ALTER TABLE face_persons
  ADD CONSTRAINT fk_representative_face
  FOREIGN KEY (representative_face_id) REFERENCES faces(id) ON DELETE SET NULL;

-- =====================================================
-- 4. MEDIA TAGS (Final tagging result)
-- =====================================================
-- Note: media_tags table may already exist, so we extend it

-- Create tag_source enum if not exists
DO $$ BEGIN
  CREATE TYPE tag_source AS ENUM ('manual', 'face_clustering', 'imported', 'suggested');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create media_tags table only if it doesn't exist
CREATE TABLE IF NOT EXISTS media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns for face clustering (if they don't exist)
-- Note: existing table has member_id and tagged_by
ALTER TABLE media_tags 
  ADD COLUMN IF NOT EXISTS source tag_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS bbox JSONB,
  ADD COLUMN IF NOT EXISTS face_id UUID REFERENCES faces(id) ON DELETE SET NULL;

-- Add unique constraint on media_id + member_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_media_member_tag'
  ) THEN
    ALTER TABLE media_tags 
      ADD CONSTRAINT unique_media_member_tag UNIQUE(media_id, member_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_media_tags_media ON media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_member ON media_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_source ON media_tags(source);

-- =====================================================
-- 5. GDPR COMPLIANCE - Event Settings
-- =====================================================
-- Add face_recognition_enabled to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS face_recognition_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_recognition_consent_version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS face_recognition_enabled_at TIMESTAMPTZ;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- ML Jobs: only event organizers can view
ALTER TABLE ml_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event organizers can view ml_jobs"
  ON ml_jobs FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage ml_jobs"
  ON ml_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Face Persons: event members can view, organizers can modify
ALTER TABLE face_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view face_persons"
  ON face_persons FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT event_id FROM event_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can manage face_persons"
  ON face_persons FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage face_persons"
  ON face_persons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Faces: event members can view, service role can write
ALTER TABLE faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view faces"
  ON faces FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT event_id FROM event_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage faces"
  ON faces FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Media Tags: event members can view, tagged users can view their tags
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist (with DO blocks to handle errors)
DO $$ 
BEGIN
  -- Policy: Event members can view media_tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'media_tags' AND policyname = 'Event members can view media_tags'
  ) THEN
    CREATE POLICY "Event members can view media_tags"
      ON media_tags FOR SELECT
      TO authenticated
      USING (
        media_id IN (
          SELECT m.id FROM media m
          JOIN event_members em ON em.event_id = m.event_id
          WHERE em.user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Users can view their own tags (using member_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'media_tags' AND policyname = 'Users can view their own tags'
  ) THEN
    CREATE POLICY "Users can view their own tags"
      ON media_tags FOR SELECT
      TO authenticated
      USING (
        member_id IN (
          SELECT id FROM event_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Event members can create tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'media_tags' AND policyname = 'Event members can create tags'
  ) THEN
    CREATE POLICY "Event members can create tags"
      ON media_tags FOR INSERT
      TO authenticated
      WITH CHECK (
        media_id IN (
          SELECT m.id FROM media m
          JOIN event_members em ON em.event_id = m.event_id
          WHERE em.user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Tag creators can delete (using tagged_by)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'media_tags' AND policyname = 'Tag creators can delete their tags'
  ) THEN
    CREATE POLICY "Tag creators can delete their tags"
      ON media_tags FOR DELETE
      TO authenticated
      USING (tagged_by = auth.uid());
  END IF;

  -- Policy: Service role can manage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'media_tags' AND policyname = 'Service role can manage media_tags'
  ) THEN
    CREATE POLICY "Service role can manage media_tags"
      ON media_tags FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Get face count per cluster
CREATE OR REPLACE FUNCTION get_face_person_stats(person_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'face_count', COUNT(*)::int,
    'avg_quality', ROUND(AVG(quality_score)::numeric, 2),
    'media_count', COUNT(DISTINCT media_id)::int
  )
  FROM faces
  WHERE face_person_id = person_id;
$$ LANGUAGE SQL STABLE;

-- Update face_persons metadata when faces are assigned
CREATE OR REPLACE FUNCTION update_face_person_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.face_person_id IS NOT NULL THEN
    UPDATE face_persons
    SET metadata = get_face_person_stats(NEW.face_person_id)
    WHERE id = NEW.face_person_id;
  END IF;
  
  IF OLD.face_person_id IS NOT NULL AND OLD.face_person_id != NEW.face_person_id THEN
    UPDATE face_persons
    SET metadata = get_face_person_stats(OLD.face_person_id)
    WHERE id = OLD.face_person_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_face_person_metadata_trigger
  AFTER INSERT OR UPDATE OF face_person_id ON faces
  FOR EACH ROW
  EXECUTE FUNCTION update_face_person_metadata();

-- GDPR: Purge all face data for a user in an event
CREATE OR REPLACE FUNCTION purge_face_data_for_user(
  p_user_id UUID,
  p_event_id UUID
)
RETURNS JSONB AS $$
DECLARE
  deleted_faces INT;
  deleted_persons INT;
  deleted_tags INT;
BEGIN
  -- Delete face embeddings for this user's face_persons
  WITH deleted_f AS (
    DELETE FROM faces 
    WHERE event_id = p_event_id 
      AND face_person_id IN (
        SELECT id FROM face_persons 
        WHERE event_id = p_event_id 
          AND linked_user_id = p_user_id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_faces FROM deleted_f;
  
  -- Delete face_persons linked to this user
  WITH deleted_p AS (
    DELETE FROM face_persons
    WHERE event_id = p_event_id 
      AND linked_user_id = p_user_id
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_persons FROM deleted_p;
  
  -- Delete media tags (member_id is event_members.id, not user_id directly)
  WITH deleted_t AS (
    DELETE FROM media_tags
    WHERE member_id IN (
      SELECT id FROM event_members 
      WHERE user_id = p_user_id AND event_id = p_event_id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_tags FROM deleted_t;
  
  RETURN jsonb_build_object(
    'deleted_faces', deleted_faces,
    'deleted_persons', deleted_persons,
    'deleted_tags', deleted_tags
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Purge embeddings when event is archived/deleted
CREATE OR REPLACE FUNCTION cleanup_face_embeddings_on_event_archive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived = true AND (OLD.archived IS NULL OR OLD.archived = false) THEN
    -- Remove embeddings but keep metadata for analytics
    UPDATE faces
    SET embedding = NULL
    WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add archived column to events if not exists
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TRIGGER cleanup_embeddings_on_archive
  AFTER UPDATE OF archived ON events
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_face_embeddings_on_event_archive();

-- =====================================================
-- 8. VIEWS FOR EASY QUERYING
-- =====================================================

-- Face persons with stats
CREATE OR REPLACE VIEW face_persons_with_stats AS
SELECT 
  fp.*,
  COUNT(f.id) as face_count,
  AVG(f.quality_score) as avg_quality,
  COUNT(DISTINCT f.media_id) as media_count,
  p.display_name as linked_user_name,
  p.avatar_url as linked_user_avatar
FROM face_persons fp
LEFT JOIN faces f ON f.face_person_id = fp.id
LEFT JOIN profiles p ON p.id = fp.linked_user_id
GROUP BY fp.id, p.display_name, p.avatar_url;

-- Media with face tags
CREATE OR REPLACE VIEW media_with_face_tags AS
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
FROM media m
LEFT JOIN media_tags mt ON mt.media_id = m.id
LEFT JOIN event_members em ON em.id = mt.member_id
LEFT JOIN profiles p ON p.id = em.user_id
GROUP BY m.id;

-- =====================================================
-- 9. SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Find all unprocessed events (no faces detected yet)
-- SELECT e.* FROM events e
-- WHERE e.face_recognition_enabled = true
--   AND NOT EXISTS (SELECT 1 FROM faces WHERE event_id = e.id);

-- Get clustering progress for an event
-- SELECT 
--   COUNT(DISTINCT m.id) as total_media,
--   COUNT(DISTINCT f.id) as faces_detected,
--   COUNT(DISTINCT fp.id) as clusters_created,
--   COUNT(DISTINCT fp.id) FILTER (WHERE fp.status = 'linked') as clusters_linked
-- FROM events e
-- LEFT JOIN media m ON m.event_id = e.id
-- LEFT JOIN faces f ON f.media_id = m.id
-- LEFT JOIN face_persons fp ON fp.event_id = e.id
-- WHERE e.id = 'event-uuid';

COMMENT ON TABLE ml_jobs IS 'Queue for ML processing jobs (face detection & clustering)';
COMMENT ON TABLE face_persons IS 'Clusters of faces representing individual persons per event';
COMMENT ON TABLE faces IS 'Individual detected faces with embeddings and metadata';
COMMENT ON TABLE media_tags IS 'Final user tags on media (manual or from face clustering)';

