-- =====================================================
-- MEMORIA SEED DATA - CORRECTED FOR SUPABASE
-- =====================================================
-- This file provides sample data for testing the Memoria application
-- Run this after schema.sql and policies.sql for testing purposes

-- =====================================================
-- 1. SAMPLE PROFILES (Optional - for testing)
-- =====================================================

-- Note: In production, profiles are created automatically when users sign up
-- This section is commented out by default to avoid conflicts

/*
-- Insert sample profiles (uncomment and update IDs with actual user IDs from your auth.users table)
INSERT INTO public.profiles (id, display_name, avatar_url, bio, location, website) VALUES
('00000000-0000-0000-0000-000000000001', 'Alice Smith', 'https://via.placeholder.com/150', 'Photography enthusiast', 'Paris, France', 'https://alice-photo.com'),
('00000000-0000-0000-0000-000000000002', 'Bob Johnson', 'https://via.placeholder.com/150', 'Event organizer', 'London, UK', 'https://bob-events.com')
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- 2. SAMPLE EVENTS (Optional - for testing)
-- =====================================================

/*
-- Insert sample events (uncomment and update owner_id with actual user IDs)
INSERT INTO public.events (id, owner_id, title, description, date, location, visibility, face_recognition_enabled) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Summer BBQ 2024', 'Annual summer barbecue party with friends and family', '2024-07-15 14:00:00+00', 'Central Park, New York', 'public', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'Family Reunion', 'Smith family reunion at the lake house', '2024-08-20 12:00:00+00', 'Lake House, Vermont', 'private', false),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Wedding Reception', 'Beautiful wedding celebration', '2024-09-10 18:00:00+00', 'Grand Hotel, Paris', 'private', true)
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- 3. SAMPLE EVENT MEMBERS (Optional - for testing)
-- =====================================================

/*
-- Insert sample event members (uncomment and update with actual event IDs)
INSERT INTO public.event_members (event_id, user_id, name, email, role, joined_at) VALUES
-- For Summer BBQ 2024
('event-uuid-1', '00000000-0000-0000-0000-000000000001', 'Alice Smith', 'alice@example.com', 'owner', NOW()),
('event-uuid-1', '00000000-0000-0000-0000-000000000002', 'Bob Johnson', 'bob@example.com', 'participant', NOW()),
-- For Family Reunion
('event-uuid-2', '00000000-0000-0000-0000-000000000002', 'Bob Johnson', 'bob@example.com', 'owner', NOW()),
('event-uuid-2', '00000000-0000-0000-0000-000000000001', 'Alice Smith', 'alice@example.com', 'participant', NOW())
ON CONFLICT (event_id, user_id) DO NOTHING;
*/

-- =====================================================
-- 4. HELPER FUNCTIONS FOR TESTING
-- =====================================================

-- Function to create a test user profile (for development only)
CREATE OR REPLACE FUNCTION public.create_test_profile(
  p_user_id UUID,
  p_display_name TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, display_name, bio, location)
  VALUES (p_user_id, p_display_name, 'Test user profile', 'Test Location')
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a test event with members
CREATE OR REPLACE FUNCTION public.create_test_event(
  p_owner_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_visibility TEXT DEFAULT 'private',
  p_face_recognition_enabled BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  -- Create event
  INSERT INTO public.events (owner_id, title, description, location, visibility, face_recognition_enabled)
  VALUES (p_owner_id, p_title, p_description, p_location, p_visibility, p_face_recognition_enabled)
  RETURNING id INTO event_id;
  
  -- Add owner as member
  INSERT INTO public.event_members (event_id, user_id, name, email, role, joined_at)
  VALUES (event_id, p_owner_id, 'Event Owner', 'owner@example.com', 'owner', NOW())
  ON CONFLICT (event_id, user_id) DO NOTHING;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add test media to an event
CREATE OR REPLACE FUNCTION public.add_test_media(
  p_event_id UUID,
  p_user_id UUID,
  p_type TEXT DEFAULT 'photo',
  p_storage_path TEXT DEFAULT 'test/path.jpg',
  p_thumb_path TEXT DEFAULT 'test/thumb.jpg'
)
RETURNS UUID AS $$
DECLARE
  media_id UUID;
BEGIN
  INSERT INTO public.media (event_id, user_id, type, storage_path, thumb_path)
  VALUES (p_event_id, p_user_id, p_type, p_storage_path, p_thumb_path)
  RETURNING id INTO media_id;
  
  RETURN media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Check if schema is properly set up
SELECT 'Schema verification:' AS status;

-- Count tables
SELECT 
  'Tables created: ' || COUNT(*)::TEXT AS info
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'events', 'event_members', 'media', 'media_tags', 'notifications', 'ml_jobs', 'face_persons', 'faces', 'media_views');

-- Check RLS is enabled
SELECT 
  'RLS enabled on: ' || COUNT(*)::TEXT AS info
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relrowsecurity = true;

-- Check indexes
SELECT 
  'Indexes created: ' || COUNT(*)::TEXT AS info
FROM pg_indexes 
WHERE schemaname = 'public';

-- Check functions
SELECT 
  'Functions created: ' || COUNT(*)::TEXT AS info
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE '%memoria%' OR p.proname IN ('create_notification', 'add_event_member', 'tag_media_bulk');

-- =====================================================
-- 6. SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Query to get all events with member counts
/*
SELECT 
  e.id,
  e.title,
  e.visibility,
  e.face_recognition_enabled,
  COUNT(em.id) as member_count,
  COUNT(m.id) as media_count
FROM public.events e
LEFT JOIN public.event_members em ON e.id = em.event_id
LEFT JOIN public.media m ON e.id = m.event_id
GROUP BY e.id, e.title, e.visibility, e.face_recognition_enabled
ORDER BY e.created_at DESC;
*/

-- Query to get media with tags
/*
SELECT 
  m.id,
  m.type,
  m.storage_path,
  COUNT(mt.id) as tag_count,
  jsonb_agg(
    jsonb_build_object(
      'member_name', em.name,
      'member_email', em.email,
      'tagged_by', p.display_name
    )
  ) FILTER (WHERE mt.id IS NOT NULL) as tags
FROM public.media m
LEFT JOIN public.media_tags mt ON m.id = mt.media_id
LEFT JOIN public.event_members em ON em.id = mt.member_id
LEFT JOIN public.profiles p ON p.id = mt.tagged_by
GROUP BY m.id, m.type, m.storage_path
ORDER BY m.created_at DESC;
*/

-- Query to get face clustering progress
/*
SELECT 
  e.id as event_id,
  e.title,
  e.face_recognition_enabled,
  COUNT(DISTINCT m.id) as total_media,
  COUNT(DISTINCT f.id) as faces_detected,
  COUNT(DISTINCT fp.id) as clusters_created,
  COUNT(DISTINCT fp.id) FILTER (WHERE fp.status = 'linked') as clusters_linked
FROM public.events e
LEFT JOIN public.media m ON m.event_id = e.id
LEFT JOIN public.faces f ON f.media_id = m.id
LEFT JOIN public.face_persons fp ON fp.event_id = e.id
WHERE e.face_recognition_enabled = true
GROUP BY e.id, e.title, e.face_recognition_enabled
ORDER BY e.created_at DESC;
*/

-- =====================================================
-- 7. CLEANUP FUNCTIONS (for testing)
-- =====================================================

-- Function to clean up test data
CREATE OR REPLACE FUNCTION public.cleanup_test_data()
RETURNS TEXT AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete test media
  DELETE FROM public.media WHERE storage_path LIKE 'test/%';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete test events
  DELETE FROM public.events WHERE title LIKE '%Test%';
  
  -- Delete test profiles (be careful with this)
  -- DELETE FROM public.profiles WHERE bio = 'Test user profile';
  
  RETURN 'Cleaned up ' || deleted_count::TEXT || ' test records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. DEVELOPMENT NOTES
-- =====================================================

/*
DEVELOPMENT SETUP INSTRUCTIONS:

1. Create a Supabase project
2. Run schema_corrected.sql first
3. Run policies_corrected.sql second
4. Run this seed file (optional for testing)

5. For testing with real data:
   - Create users through Supabase Auth dashboard
   - Use the app to create events and upload media
   - Test the complete flow

6. For development testing:
   - Uncomment the sample data sections above
   - Update the UUIDs with real user IDs from auth.users
   - Run the queries to verify setup

7. Storage bucket setup:
   - Create a 'media' bucket in Supabase Storage
   - Set it to public for read access
   - Configure storage policies via dashboard or API

8. Environment variables needed:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (for ML functions)

9. ML System setup:
   - Deploy the worker application
   - Configure the ML callback endpoints
   - Test face detection and clustering

10. Monitoring:
    - Check Supabase logs for any RLS policy errors
    - Monitor ML job queue for processing status
    - Verify notifications are being created correctly
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Seed data setup completed successfully!' AS status;
SELECT 'Ready for Memoria application deployment!' AS message;
