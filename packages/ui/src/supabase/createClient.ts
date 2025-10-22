/**
 * Supabase client factory
 * Creates a configured Supabase client with the provided URL and key
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function createClient(config: SupabaseConfig) {
  // Validate config
  if (!config.url || config.url.includes('your-project')) {
    throw new Error(
      '❌ Supabase URL manquant ou invalide.\n\n' +
      '👉 Créez un fichier .env avec:\n' +
      '   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co\n' +
      '   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé\n\n' +
      '📖 Voir QUICKSTART.md pour les instructions complètes'
    );
  }
  
  if (!config.anonKey || config.anonKey.includes('your-anon-key')) {
    throw new Error(
      '❌ Supabase anon key manquante ou invalide.\n\n' +
      '👉 Ajoutez votre clé dans le fichier .env\n' +
      '📖 Voir QUICKSTART.md pour les instructions'
    );
  }

  return createSupabaseClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export type SupabaseClient = ReturnType<typeof createClient>;

