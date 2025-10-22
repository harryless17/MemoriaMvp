/**
 * Zod schemas for validation
 */
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
});

export const EventSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  date: z.string().datetime().nullable(),
  location: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  created_at: z.string().datetime(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(2000).optional(),
  date: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const MediaSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  type: z.enum(['photo', 'video']),
  storage_path: z.string(),
  thumb_path: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  created_at: z.string().datetime(),
});

export const CreateMediaSchema = z.object({
  event_id: z.string().uuid(),
  type: z.enum(['photo', 'video']),
  storage_path: z.string(),
  thumb_path: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const CommentSchema = z.object({
  id: z.string().uuid(),
  media_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  text: z.string().min(1).max(2000),
  created_at: z.string().datetime(),
});

export const CreateCommentSchema = z.object({
  media_id: z.string().uuid(),
  text: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});

export const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
});

