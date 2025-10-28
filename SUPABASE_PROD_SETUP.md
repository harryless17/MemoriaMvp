# Scripts SQL pour Supabase Production

## 1. Schema Principal (infra/supabase/schema.sql)

Copiez et exécutez ce script dans SQL Editor :

```sql
-- Memoria Database Schema
-- Run this first to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ,
  location TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendees (membership)
CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Media table (photos/videos)
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS public.likes (
  media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (media_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_media_event_id ON public.media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_visibility ON public.media(visibility);
CREATE INDEX IF NOT EXISTS idx_likes_media_id ON public.likes(media_id);
CREATE INDEX IF NOT EXISTS idx_comments_media_id ON public.comments(media_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
```

## 2. Politiques RLS (infra/supabase/policies.sql)

Copiez et exécutez ce script dans SQL Editor :

```sql
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

-- Everyone can read public events
CREATE POLICY "events_select_public" 
ON public.events 
FOR SELECT 
USING (visibility = 'public');

-- Event members can read private events
CREATE POLICY "events_select_private_members" 
ON public.events 
FOR SELECT 
USING (visibility = 'private' AND is_event_member(id));

-- Event owners can read their own events
CREATE POLICY "events_select_own" 
ON public.events 
FOR SELECT 
USING (owner_id = auth.uid());

-- Authenticated users can create events
CREATE POLICY "events_insert_authenticated" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Event owners can update their events
CREATE POLICY "events_update_own" 
ON public.events 
FOR UPDATE 
USING (owner_id = auth.uid());

-- Event owners can delete their events
CREATE POLICY "events_delete_own" 
ON public.events 
FOR DELETE 
USING (owner_id = auth.uid());

-- ============================================
-- EVENT ATTENDEES POLICIES
-- ============================================

-- Event members can read attendees
CREATE POLICY "event_attendees_select_members" 
ON public.event_attendees 
FOR SELECT 
USING (is_event_member(event_id));

-- Users can join events
CREATE POLICY "event_attendees_insert_join" 
ON public.event_attendees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can leave events
CREATE POLICY "event_attendees_delete_leave" 
ON public.event_attendees 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- MEDIA POLICIES
-- ============================================

-- Everyone can read public media
CREATE POLICY "media_select_public" 
ON public.media 
FOR SELECT 
USING (visibility = 'public');

-- Event members can read private media
CREATE POLICY "media_select_private_members" 
ON public.media 
FOR SELECT 
USING (visibility = 'private' AND is_event_member(event_id));

-- Event members can upload media
CREATE POLICY "media_insert_members" 
ON public.media 
FOR INSERT 
WITH CHECK (is_event_member(event_id));

-- Media owners can update their media
CREATE POLICY "media_update_own" 
ON public.media 
FOR UPDATE 
USING (user_id = auth.uid());

-- Media owners can delete their media
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
CREATE POLICY "likes_insert_authenticated" 
ON public.likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can unlike their likes
CREATE POLICY "likes_delete_own" 
ON public.likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS POLICIES
-- ============================================

-- Everyone can read comments
CREATE POLICY "comments_select_all" 
ON public.comments 
FOR SELECT 
USING (true);

-- Authenticated users can comment
CREATE POLICY "comments_insert_authenticated" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Comment owners can update their comments
CREATE POLICY "comments_update_own" 
ON public.comments 
FOR UPDATE 
USING (user_id = auth.uid());

-- Comment owners can delete their comments
CREATE POLICY "comments_delete_own" 
ON public.comments 
FOR DELETE 
USING (user_id = auth.uid());
```

## 3. Configuration Storage

1. Aller dans **Storage**
2. Créer un bucket : `media`
3. Rendre le bucket **Public**
4. Appliquer ces politiques de storage :

```sql
-- Storage policies for media bucket
CREATE POLICY "media_bucket_select" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "media_bucket_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'media');

CREATE POLICY "media_bucket_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'media');

CREATE POLICY "media_bucket_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'media');
```

## 4. Configuration Authentication

1. Aller dans **Authentication > Settings**
2. Activer **Email** provider
3. Configurer **Google OAuth** (optionnel) :
   - Aller sur [Google Cloud Console](https://console.cloud.google.com)
   - Créer un projet OAuth
   - Ajouter les URLs de redirection :
     - `https://your-new-project-id.supabase.co/auth/v1/callback`
     - `https://your-vercel-app.vercel.app/auth/callback`

## 5. Récupérer les nouvelles clés

1. Aller dans **Settings > API**
2. Noter :
   - **Project URL** : `https://xxx.supabase.co`
   - **Anon Key** : `eyJ...`
   - **Service Role Key** : `eyJ...` (pour plus tard)
