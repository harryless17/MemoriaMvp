import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { ThemeProvider } from '../src/contexts/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    // Ensure profile exists on auth state change (but don't overwrite existing display_name!)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Check if profile exists first
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', session.user.id)
          .single();

        // Only create if profile doesn't exist
        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: session.user.id,
            display_name: session.user.user_metadata?.full_name || session.user.email,
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen 
            name="event/[id]" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="events/[id]/edit" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="events/new" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="viewer/[mediaId]" 
            options={{ 
              presentation: 'fullScreenModal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="upload" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="stories/viewer" 
            options={{ 
              presentation: 'fullScreenModal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="stories/new" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="albums/[id]" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="albums/[id]/edit" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="albums/new" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="profile/edit" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="user/[id]" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

