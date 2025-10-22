'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redirection: /tag est obsolète, utiliser /people à la place
 */
export default function TagRedirect() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  useEffect(() => {
    // Redirect to /people with manual mode
    router.replace(`/e/${eventId}/people`);
  }, [eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-600 dark:text-slate-400">Redirection vers la nouvelle page...</p>
    </div>
  );
}

