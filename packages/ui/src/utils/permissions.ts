/**
 * Permission and visibility utilities
 */
import type { Event, Media } from '../types';

export function isEventReadable(event: Event, userId: string | null): boolean {
  // All events are private in V2, only members can read
  if (!userId) return false;
  // Check if user is owner (member check should be done in the app)
  return event.owner_id === userId;
}

export function canEditEvent(event: Event, userId: string | null): boolean {
  if (!userId) return false;
  return event.owner_id === userId;
}

export function canEditMedia(media: Media, userId: string | null): boolean {
  if (!userId) return false;
  return media.user_id === userId;
}

export function getMediaUrl(storagePath: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`;
}

export function getThumbUrl(thumbPath: string | null, supabaseUrl: string): string | null {
  if (!thumbPath) return null;
  return `${supabaseUrl}/storage/v1/object/public/media/${thumbPath}`;
}
