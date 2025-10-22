-- Memoria Seed Data
-- Optional: Run this to populate database with sample data for testing

-- Note: This assumes you have at least one user in auth.users
-- You can get user IDs by running: SELECT id FROM auth.users;

-- Insert sample profiles (update IDs with actual user IDs from your auth.users table)
-- INSERT INTO public.profiles (id, display_name, avatar_url) VALUES
-- ('user-uuid-1', 'Alice Smith', 'https://via.placeholder.com/150'),
-- ('user-uuid-2', 'Bob Johnson', 'https://via.placeholder.com/150');

-- Insert sample events
-- INSERT INTO public.events (id, owner_id, title, description, date, location, visibility) VALUES
-- (gen_random_uuid(), 'user-uuid-1', 'Summer BBQ 2024', 'Annual summer barbecue party', '2024-07-15 14:00:00+00', 'Central Park', 'public'),
-- (gen_random_uuid(), 'user-uuid-2', 'Family Reunion', 'Smith family reunion', '2024-08-20 12:00:00+00', 'Lake House', 'private');

-- Note: For actual testing, create accounts through the app and generate real data

-- To create a test user via SQL (not recommended for production):
-- This requires direct access to auth.users which is typically managed by Supabase Auth

-- For development, use the Supabase dashboard to:
-- 1. Create test users via Authentication > Users > Add User
-- 2. Use the app to create events and upload media
-- 3. Test the flow end-to-end

-- Sample query to verify setup:
SELECT 'Schema setup complete!' AS status;
SELECT COUNT(*) AS profile_count FROM public.profiles;
SELECT COUNT(*) AS event_count FROM public.events;
SELECT COUNT(*) AS media_count FROM public.media;

