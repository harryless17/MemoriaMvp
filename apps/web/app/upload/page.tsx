'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { UploadForm } from '@/components/UploadForm';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-8 md:pt-32 md:pb-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Upload Media</h1>
        <UploadForm />
      </div>
    </div>
  );
}

