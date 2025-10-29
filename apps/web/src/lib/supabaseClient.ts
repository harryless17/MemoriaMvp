/**
 * Supabase client for web app
 */
import { createClient } from '@memoria/ui';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!anonKey) {
      throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    supabaseInstance = createClient({
      url,
      anonKey,
    });
  }
  return supabaseInstance;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

