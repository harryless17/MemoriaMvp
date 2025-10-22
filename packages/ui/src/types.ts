/**
 * Core type definitions for Memoria V2
 * Centered around event management and media tagging
 */

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  date: string | null;
  location: string | null;
  created_at: string;
  owner?: Profile;
  member_count?: number;
  media_count?: number;
  untagged_media_count?: number;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: 'owner' | 'co-organizer' | 'participant';
  invitation_token: string | null;
  invitation_sent_at: string | null;
  joined_at: string | null;
  created_at: string;
  user?: Profile;
  media_count?: number;
}

export interface Media {
  id: string;
  event_id: string;
  user_id: string | null;
  type: 'photo' | 'video';
  storage_path: string;
  thumb_path: string | null;
  created_at: string;
  uploader?: Profile;
  event?: Event;
  tags?: MediaTag[];
  tagged_members?: EventMember[];
  tag_count?: number;
}

export interface MediaTag {
  id: string;
  media_id: string;
  member_id: string;
  tagged_by: string | null;
  tagged_at: string;
  member?: EventMember;
  tagger?: Profile;
}

export interface EventWithStats extends Event {
  my_role?: 'owner' | 'co-organizer' | 'participant';
  my_media_count?: number;
}

export interface MediaWithTags extends Media {
  tags: MediaTag[];
  tagged_members: EventMember[];
}

export interface UploadQueueItem {
  id: string;
  eventId: string;
  uri: string;
  type: 'photo' | 'video';
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
  retryCount: number;
}

// Helper types for API responses
export interface MemberMediaCount {
  member_id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string;
  media_count: number;
}

export interface EventStats {
  event_id: string;
  title: string;
  member_count: number;
  media_count: number;
  untagged_media_count: number;
}

export interface UntaggedMedia extends Media {
  event_title: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'tagged_in_media' | 'added_to_event' | 'invitation_sent';
  event_id: string;
  media_id?: string;
  actor_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  event?: Event;
  media?: Media;
  actor?: Profile;
}