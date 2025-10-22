import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  if (isAuthenticated === null) {
    return null; // Loading
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/feed' : '/(auth)/login'} />;
}

