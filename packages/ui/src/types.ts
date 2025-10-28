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
  visibility: 'public' | 'private';
  face_recognition_enabled: boolean;
  face_recognition_enabled_at: string | null;
  face_recognition_consent_version: number;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
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
  source: 'manual' | 'face_clustering' | 'imported' | 'suggested';
  bbox: any | null;
  face_id: string | null;
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
  type: 'tagged_in_media' | 'added_to_event' | 'invitation_sent' | 'new_photos';
  event_id: string;
  media_id?: string;
  actor_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  event?: Event;
  media?: Media;
  actor?: Profile;
}

// Face Clustering Types
export interface MLJob {
  id: string;
  job_type: 'detect' | 'cluster';
  event_id: string;
  media_ids: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  max_attempts: number;
  error?: string;
  result?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FacePerson {
  id: string;
  event_id: string;
  cluster_label: number;
  representative_face_id?: string;
  linked_user_id?: string;
  status: 'pending' | 'linked' | 'invited' | 'ignored' | 'merged';
  invitation_email?: string;
  invited_at?: string;
  merged_into_id?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  face_count?: number;
  avg_quality?: number;
  media_count?: number;
  linked_user_name?: string;
  linked_user_avatar?: string;
  representative_face?: Face;
}

export interface Face {
  id: string;
  media_id: string;
  event_id: string;
  face_person_id?: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  embedding?: number[];
  quality_score?: number;
  landmarks?: any;
  created_at: string;
}

export interface MediaView {
  id: string;
  media_id: string;
  viewer_id?: string;
  viewer_ip?: string;
  viewed_at: string;
}