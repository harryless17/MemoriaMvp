/**
 * Supabase client for mobile app
 */
import { createClient } from '@memoria/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
});

// Configure session storage
supabase.auth.setSession = async (session) => {
  if (session) {
    await AsyncStorage.setItem('supabase.session', JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem('supabase.session');
  }
};

