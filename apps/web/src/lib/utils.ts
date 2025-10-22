import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getThumbUrl(thumbPath: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/thumbs/${thumbPath}`
}

export function getMediaUrl(mediaPath: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/media/${mediaPath}`
}