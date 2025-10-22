# Database Schema Reference

## Table: events
- id (uuid)
- owner_id (uuid, nullable)
- title (text)
- description (text, nullable)
- date (timestamp, nullable)
- location (text, nullable)
- visibility (text)
- created_at (timestamp)
- face_recognition_enabled (boolean, default: false)
- face_recognition_consent_version (integer, default: 1)
- face_recognition_enabled_at (timestamp, nullable)
- archived (boolean, default: false)
- archived_at (timestamp, nullable)

## Table: event_members
- id (uuid)
- event_id (uuid)
- user_id (uuid, nullable)
- name (text)
- email (text)
- role (text) - CHECK: 'owner', 'co-organizer', 'participant'
- invitation_token (text, nullable)
- invitation_sent_at (timestamp, nullable)
- joined_at (timestamp, nullable)
- created_at (timestamp)

## Table: media
- id (uuid)
- event_id (uuid, nullable)
- user_id (uuid, nullable)
- type (text) - CHECK: 'photo', 'video'
- storage_path (text)
- thumb_path (text, nullable)
- created_at (timestamp)

## Table: media_tags
- id (uuid)
- media_id (uuid)
- member_id (uuid) - FK to event_members
- tagged_by (uuid, nullable)
- tagged_at (timestamp)
- source (tag_source, default: 'manual')
- bbox (jsonb, nullable)
- face_id (uuid, nullable)

## Table: faces
- id (uuid)
- media_id (uuid)
- event_id (uuid)
- face_person_id (uuid, nullable)
- bbox (jsonb)
- embedding (vector)
- quality_score (double precision, nullable)
- landmarks (jsonb, nullable)
- created_at (timestamp)

## Table: face_persons
- id (uuid)
- event_id (uuid)
- cluster_label (integer)
- representative_face_id (uuid, nullable)
- linked_user_id (uuid, nullable)
- status (face_person_status, default: 'pending')
- invitation_email (text, nullable)
- invited_at (timestamp, nullable)
- merged_into_id (uuid, nullable)
- metadata (jsonb, default: '{}')
- created_at (timestamp)
- updated_at (timestamp)
- created_by_user_id (uuid, nullable)

## Table: profiles
- id (uuid)
- display_name (text, nullable)
- avatar_url (text, nullable)
- bio (text, nullable)
- location (text, nullable)
- website (text, nullable)
- phone (text, nullable)
- date_of_birth (date, nullable)
- created_at (timestamp)
- updated_at (timestamp)

## Table: notifications
- id (uuid)
- user_id (uuid, nullable)
- type (text) - CHECK: 'tagged_in_media', 'added_to_event', 'invitation_sent', 'new_photos'
- event_id (uuid, nullable)
- media_id (uuid, nullable)
- title (text)
- message (text)
- is_read (boolean, default: false)
- created_at (timestamp)
- actor_id (uuid, nullable)
- updated_at (timestamp)

## Table: ml_jobs
- id (uuid)
- job_type (job_type) - 'detect_faces', 'cluster_faces'
- event_id (uuid)
- media_ids (uuid[], nullable)
- status (job_status, default: 'pending') - 'pending', 'processing', 'completed', 'failed'
- priority (job_priority, default: 'normal') - 'low', 'normal', 'high'
- attempts (integer, default: 0)
- max_attempts (integer, default: 3)
- error (text, nullable)
- result (jsonb, nullable)
- started_at (timestamp, nullable)
- completed_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- clustering_sensitivity (text, default: 'moyen')

## Table: albums
- (Not included in schema query)

## Table: album_media
- id (uuid)
- album_id (uuid)
- media_id (uuid)
- order_index (integer, default: 0)
- added_at (timestamp)

## Table: media_views
- id (uuid)
- media_id (uuid)
- viewer_id (uuid, nullable)
- viewer_ip (text, nullable)
- viewed_at (timestamp)

## Important Notes:
1. `events` table does NOT have `thumbnail`, `thumbnail_type`, or `thumb_path` columns
2. `media_tags.member_id` references `event_members.id`, NOT `auth.users.id`
3. `event_members` has `media_count` and `tagged_count` columns (not shown in schema - likely computed/virtual)
4. `media` table uses `user_id`, NOT `uploaded_by`

