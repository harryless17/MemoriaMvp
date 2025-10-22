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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_visibility_created ON public.events (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events (owner_id);
CREATE INDEX IF NOT EXISTS idx_media_event ON public.media (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_visibility_created ON public.media (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_user ON public.media (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_media ON public.comments (media_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_likes_media ON public.likes (media_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees (user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees (event_id);

-- Create Storage bucket for media
-- Note: This might need to be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
-- ON CONFLICT (id) DO NOTHING;

