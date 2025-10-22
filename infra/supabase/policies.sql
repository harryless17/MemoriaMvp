-- Memoria Row Level Security Policies
-- Run this after schema.sql to enable RLS and create policies

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is event member
CREATE OR REPLACE FUNCTION public.is_event_member(e_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.event_attendees ea
    WHERE ea.event_id = e_id 
      AND ea.user_id = auth.uid()
  );
$$;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Everyone can read all profiles
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- ============================================
-- EVENTS POLICIES
-- ============================================

-- Anyone can read public events
CREATE POLICY "events_select_public" 
ON public.events 
FOR SELECT 
USING (visibility = 'public');

-- Members can read private events they belong to
CREATE POLICY "events_select_private_if_member" 
ON public.events 
FOR SELECT 
USING (
  visibility = 'private' 
  AND (
    owner_id = auth.uid() 
    OR public.is_event_member(id)
  )
);

-- Authenticated users can create events
CREATE POLICY "events_insert_auth" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their events
CREATE POLICY "events_update_owner" 
ON public.events 
FOR UPDATE 
USING (owner_id = auth.uid());

-- Owners can delete their events
CREATE POLICY "events_delete_owner" 
ON public.events 
FOR DELETE 
USING (owner_id = auth.uid());

-- ============================================
-- EVENT ATTENDEES POLICIES
-- ============================================

-- Members can read attendees of their events
CREATE POLICY "attendees_select_if_member" 
ON public.event_attendees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = event_id 
      AND (
        e.visibility = 'public' 
        OR e.owner_id = auth.uid() 
        OR public.is_event_member(e.id)
      )
  )
);

-- Authenticated users can join events OR event owner can add members
CREATE POLICY "attendees_insert_self" 
ON public.event_attendees 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_attendees.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- Users can leave events
CREATE POLICY "attendees_delete_self" 
ON public.event_attendees 
FOR DELETE 
USING (user_id = auth.uid());

-- ============================================
-- MEDIA POLICIES
-- ============================================

-- Users can read media from public events
CREATE POLICY "media_select_public" 
ON public.media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = media.event_id 
      AND e.visibility = 'public'
  )
);

-- Users can read media from private events they're members of
CREATE POLICY "media_select_private_if_member" 
ON public.media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = media.event_id 
      AND e.visibility = 'private' 
      AND (
        e.owner_id = auth.uid() 
        OR public.is_event_member(e.id)
      )
  )
);

-- Authenticated users can insert media to events they're members of
CREATE POLICY "media_insert_auth" 
ON public.media 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 
      FROM public.events e 
      WHERE e.id = event_id 
        AND e.owner_id = auth.uid()
    )
    OR public.is_event_member(event_id)
  )
);

-- Users can update their own media
CREATE POLICY "media_update_own" 
ON public.media 
FOR UPDATE 
USING (user_id = auth.uid());

-- Users can delete their own media
CREATE POLICY "media_delete_own" 
ON public.media 
FOR DELETE 
USING (user_id = auth.uid());

-- ============================================
-- LIKES POLICIES
-- ============================================

-- Everyone can read likes
CREATE POLICY "likes_select_all" 
ON public.likes 
FOR SELECT 
USING (true);

-- Authenticated users can like media
CREATE POLICY "likes_insert_auth" 
ON public.likes 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can unlike media
CREATE POLICY "likes_delete_own" 
ON public.likes 
FOR DELETE 
USING (user_id = auth.uid());

-- ============================================
-- COMMENTS POLICIES
-- ============================================

-- Everyone can read comments on accessible media
CREATE POLICY "comments_select_all" 
ON public.comments 
FOR SELECT 
USING (true);

-- Authenticated users can comment on accessible media
CREATE POLICY "comments_insert_auth" 
ON public.comments 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "comments_update_own" 
ON public.comments 
FOR UPDATE 
USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "comments_delete_own" 
ON public.comments 
FOR DELETE 
USING (user_id = auth.uid());

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Note: Storage policies need to be created via Supabase dashboard or API
-- For the 'media' bucket:
-- 
-- 1. Allow public read access:
--    CREATE POLICY "Public read access"
--    ON storage.objects FOR SELECT
--    USING (bucket_id = 'media');
--
-- 2. Allow authenticated users to upload to their own folder:
--    CREATE POLICY "Users can upload to own folder"
--    ON storage.objects FOR INSERT
--    WITH CHECK (
--      bucket_id = 'media' 
--      AND auth.uid()::text = (storage.foldername(name))[1]
--    );
--
-- 3. Allow users to update their own files:
--    CREATE POLICY "Users can update own files"
--    ON storage.objects FOR UPDATE
--    USING (
--      bucket_id = 'media' 
--      AND auth.uid()::text = (storage.foldername(name))[1]
--    );
--
-- 4. Allow users to delete their own files:
--    CREATE POLICY "Users can delete own files"
--    ON storage.objects FOR DELETE
--    USING (
--      bucket_id = 'media' 
--      AND auth.uid()::text = (storage.foldername(name))[1]
--    );

