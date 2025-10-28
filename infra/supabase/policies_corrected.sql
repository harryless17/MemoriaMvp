-- =====================================================
-- MEMORIA ROW LEVEL SECURITY POLICIES - CORRECTED FOR SUPABASE
-- =====================================================
-- This file creates all RLS policies for the Memoria application
-- Run this after schema.sql to enable RLS and create policies

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is event member
CREATE OR REPLACE FUNCTION public.is_event_member(e_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.event_members em
    WHERE em.event_id = e_id 
      AND em.user_id = auth.uid()
  );
$$;

-- Function to check if user is event organizer (owner or co-organizer)
CREATE OR REPLACE FUNCTION public.is_event_organizer(e_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.event_members em
    WHERE em.event_id = e_id 
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'co-organizer')
  );
$$;

-- Function to check if user can tag in event
CREATE OR REPLACE FUNCTION public.can_tag_in_event(e_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.event_members em
    WHERE em.event_id = e_id 
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'co-organizer')
  );
$$;

-- =====================================================
-- 3. PROFILES POLICIES
-- =====================================================

-- Everyone can read all profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- =====================================================
-- 4. EVENTS POLICIES
-- =====================================================

-- Anyone can read public events
DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public" 
ON public.events 
FOR SELECT 
USING (visibility = 'public');

-- Members can read private events they belong to
DROP POLICY IF EXISTS "events_select_private_if_member" ON public.events;
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
DROP POLICY IF EXISTS "events_insert_auth" ON public.events;
CREATE POLICY "events_insert_auth" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their events
DROP POLICY IF EXISTS "events_update_owner" ON public.events;
CREATE POLICY "events_update_owner" 
ON public.events 
FOR UPDATE 
USING (owner_id = auth.uid());

-- Owners can delete their events
DROP POLICY IF EXISTS "events_delete_owner" ON public.events;
CREATE POLICY "events_delete_owner" 
ON public.events 
FOR DELETE 
USING (owner_id = auth.uid());

-- =====================================================
-- 5. EVENT MEMBERS POLICIES
-- =====================================================

-- Members can read attendees of their events
DROP POLICY IF EXISTS "event_members_select_if_member" ON public.event_members;
CREATE POLICY "event_members_select_if_member" 
ON public.event_members 
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
DROP POLICY IF EXISTS "event_members_insert_self" ON public.event_members;
CREATE POLICY "event_members_insert_self" 
ON public.event_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_members.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- Users can update their own membership
DROP POLICY IF EXISTS "event_members_update_self" ON public.event_members;
CREATE POLICY "event_members_update_self" 
ON public.event_members 
FOR UPDATE 
USING (
  user_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_members.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- Users can leave events or owners can remove members
DROP POLICY IF EXISTS "event_members_delete_self" ON public.event_members;
CREATE POLICY "event_members_delete_self" 
ON public.event_members 
FOR DELETE 
USING (
  user_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_members.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- =====================================================
-- 6. MEDIA POLICIES
-- =====================================================

-- Users can read media from public events
DROP POLICY IF EXISTS "media_select_public" ON public.media;
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
DROP POLICY IF EXISTS "media_select_private_if_member" ON public.media;
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
DROP POLICY IF EXISTS "media_insert_auth" ON public.media;
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
DROP POLICY IF EXISTS "media_update_own" ON public.media;
CREATE POLICY "media_update_own" 
ON public.media 
FOR UPDATE 
USING (user_id = auth.uid());

-- Users can delete their own media or event owners can delete any media
DROP POLICY IF EXISTS "media_delete_own" ON public.media;
CREATE POLICY "media_delete_own" 
ON public.media 
FOR DELETE 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = media.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- =====================================================
-- 7. MEDIA TAGS POLICIES
-- =====================================================

-- Event members can view media_tags
DROP POLICY IF EXISTS "media_tags_select_if_member" ON public.media_tags;
CREATE POLICY "media_tags_select_if_member" 
ON public.media_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.media m
    JOIN public.events e ON e.id = m.event_id
    WHERE m.id = media_tags.media_id 
      AND (
        e.visibility = 'public' 
        OR e.owner_id = auth.uid() 
        OR public.is_event_member(e.id)
      )
  )
);

-- Event organizers can create tags
DROP POLICY IF EXISTS "media_tags_insert_organizer" ON public.media_tags;
CREATE POLICY "media_tags_insert_organizer" 
ON public.media_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.media m
    JOIN public.events e ON e.id = m.event_id
    WHERE m.id = media_tags.media_id 
      AND (
        e.owner_id = auth.uid() 
        OR public.can_tag_in_event(e.id)
      )
  )
);

-- Tag creators can delete their tags
DROP POLICY IF EXISTS "media_tags_delete_creator" ON public.media_tags;
CREATE POLICY "media_tags_delete_creator" 
ON public.media_tags 
FOR DELETE 
USING (
  tagged_by = auth.uid()
  OR EXISTS (
    SELECT 1 
    FROM public.media m
    JOIN public.events e ON e.id = m.event_id
    WHERE m.id = media_tags.media_id 
      AND e.owner_id = auth.uid()
  )
);

-- =====================================================
-- 8. NOTIFICATIONS POLICIES
-- =====================================================

-- Users can see their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own notifications
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- System can insert notifications (via functions)
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- =====================================================
-- 9. ML JOBS POLICIES
-- =====================================================

-- Event organizers can view ml_jobs
DROP POLICY IF EXISTS "ml_jobs_select_organizer" ON public.ml_jobs;
CREATE POLICY "ml_jobs_select_organizer" 
ON public.ml_jobs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = ml_jobs.event_id 
      AND e.owner_id = auth.uid()
  )
);

-- Service role can manage ml_jobs
DROP POLICY IF EXISTS "ml_jobs_all_service_role" ON public.ml_jobs;
CREATE POLICY "ml_jobs_all_service_role" 
ON public.ml_jobs 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 10. FACE PERSONS POLICIES
-- =====================================================

-- Event members can view face_persons
DROP POLICY IF EXISTS "face_persons_select_member" ON public.face_persons;
CREATE POLICY "face_persons_select_member" 
ON public.face_persons 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = face_persons.event_id 
      AND (
        e.visibility = 'public' 
        OR e.owner_id = auth.uid() 
        OR public.is_event_member(e.id)
      )
  )
);

-- Event organizers can manage face_persons
DROP POLICY IF EXISTS "face_persons_all_organizer" ON public.face_persons;
CREATE POLICY "face_persons_all_organizer" 
ON public.face_persons 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = face_persons.event_id 
      AND e.owner_id = auth.uid()
  )
);

-- Service role can manage face_persons
DROP POLICY IF EXISTS "face_persons_all_service_role" ON public.face_persons;
CREATE POLICY "face_persons_all_service_role" 
ON public.face_persons 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 11. FACES POLICIES
-- =====================================================

-- Event members can view faces
DROP POLICY IF EXISTS "faces_select_member" ON public.faces;
CREATE POLICY "faces_select_member" 
ON public.faces 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.id = faces.event_id 
      AND (
        e.visibility = 'public' 
        OR e.owner_id = auth.uid() 
        OR public.is_event_member(e.id)
      )
  )
);

-- Service role can manage faces
DROP POLICY IF EXISTS "faces_all_service_role" ON public.faces;
CREATE POLICY "faces_all_service_role" 
ON public.faces 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 12. MEDIA VIEWS POLICIES
-- =====================================================

-- Everyone can view media view stats
DROP POLICY IF EXISTS "media_views_select_all" ON public.media_views;
CREATE POLICY "media_views_select_all" 
ON public.media_views 
FOR SELECT 
USING (true);

-- Anyone can record a view (even anonymous)
DROP POLICY IF EXISTS "media_views_insert_all" ON public.media_views;
CREATE POLICY "media_views_insert_all" 
ON public.media_views 
FOR INSERT 
WITH CHECK (true);

-- =====================================================
-- 13. NOTIFICATION FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_event_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_media_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, event_id, media_id, actor_id, title, message)
  VALUES (p_user_id, p_type, p_event_id, p_media_id, p_actor_id, p_title, p_message)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE 
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE 
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. EVENT MEMBER FUNCTIONS
-- =====================================================

-- Function to add event member with invitation token
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
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- Generate unique URL-safe token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  
  -- Insert member
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

-- Function to tag media in bulk
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
      
      IF FOUND THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 15. TRIGGERS FOR NOTIFICATIONS
-- =====================================================

-- Trigger for notification when user is tagged in media
CREATE OR REPLACE FUNCTION public.notify_user_tagged()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  media_type TEXT;
  uploader_name TEXT;
  uploader_id UUID;
  target_user_id UUID;
  target_event_id UUID;
BEGIN
  -- Get user ID and event ID
  SELECT em.user_id, m.event_id, m.user_id
  INTO target_user_id, target_event_id, uploader_id
  FROM public.event_members em
  JOIN public.media m ON m.event_id = em.event_id
  WHERE em.id = NEW.member_id AND m.id = NEW.media_id;
  
  -- Create notification only if user has account and is not the uploader
  IF target_user_id IS NOT NULL AND target_user_id != uploader_id THEN
    -- Get event and media info
    SELECT 
      COALESCE(e.title, 'Événement inconnu'),
      COALESCE(m.type, 'photo'),
      COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1), 'Quelqu''un')
    INTO event_title, media_type, uploader_name
    FROM public.events e
    JOIN public.media m ON m.event_id = e.id
    LEFT JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN public.profiles p ON p.id = m.user_id
    WHERE m.id = NEW.media_id AND e.id = target_event_id;
    
    -- Create notification
    PERFORM public.create_notification(
      target_user_id,
      'tagged_in_media',
      target_event_id,
      'Vous avez été tagué !',
      'Vous avez été tagué dans ' || 
      CASE WHEN media_type = 'photo' THEN 'une photo' ELSE 'une vidéo' END ||
      ' par ' || COALESCE(uploader_name, 'quelqu''un') || ' dans l''événement "' || COALESCE(event_title, 'inconnu') || '"',
      NEW.media_id,
      uploader_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for notification when user is added to event
CREATE OR REPLACE FUNCTION public.notify_user_added_to_event()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  adder_name TEXT;
  adder_id UUID;
  event_owner_id UUID;
BEGIN
  -- Get event info
  SELECT 
    COALESCE(e.title, 'Événement inconnu'),
    e.owner_id
  INTO event_title, event_owner_id
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  -- Get adder name
  SELECT 
    COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1), 'Quelqu''un')
  INTO adder_name
  FROM public.profiles p
  RIGHT JOIN auth.users u ON u.id = p.id
  WHERE u.id = event_owner_id;
  
  -- Create notification if user has account and is not the owner
  IF NEW.user_id IS NOT NULL AND NEW.user_id != event_owner_id THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'added_to_event',
      NEW.event_id,
      'Nouvel événement !',
      'Vous avez été ajouté à l''événement "' || COALESCE(event_title, 'inconnu') || '" par ' || COALESCE(adder_name, 'l''organisateur'),
      NULL,
      event_owner_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_user_tagged ON public.media_tags;
CREATE TRIGGER trigger_notify_user_tagged
  AFTER INSERT ON public.media_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_tagged();

DROP TRIGGER IF EXISTS trigger_notify_user_added ON public.event_members;
CREATE TRIGGER trigger_notify_user_added
  AFTER INSERT ON public.event_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_added_to_event();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'RLS Policies setup completed successfully!' AS status;
