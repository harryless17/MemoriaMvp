'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNotificationListener } from '@/hooks/useNotificationListener';

/**
 * Component that sets up real-time notification listening for the current user
 * Should be mounted in the root layout
 */
export function NotificationListener() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }

    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use the notification listener hook
  useNotificationListener(userId);

  // This component renders nothing
  return null;
}

