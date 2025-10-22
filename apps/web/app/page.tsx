'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/landing');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Chargement...</p>
      </div>
    </div>
  );
}