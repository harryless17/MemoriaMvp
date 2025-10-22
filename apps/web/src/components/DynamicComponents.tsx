'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
export const LazyMediaViewer = dynamic(
  () => import('./MediaViewer').then(mod => ({ default: mod.MediaViewer })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);

export const LazyMediaGrid = dynamic(
  () => import('./MediaGrid').then(mod => ({ default: mod.MediaGrid })),
  {
    loading: () => (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-4">
            <div className="glass-card h-48 bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
);

export const LazyMembersList = dynamic(
  () => import('./MembersList').then(mod => ({ default: mod.MembersList })),
  {
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 glass-card animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
);

export const LazyUploadForm = dynamic(
  () => import('./UploadForm').then(mod => ({ default: mod.UploadForm })),
  {
    loading: () => (
      <div className="glass-card p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    ),
    ssr: false
  }
);

// Wrapper with Suspense for better error handling
export function DynamicWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
