'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from './ui/toast';
import { ErrorBoundary } from './ErrorBoundary';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache les données pendant 5 minutes (au lieu de 1 minute)
            staleTime: 5 * 60 * 1000,
            // Garde les données en cache pendant 10 minutes même si non utilisées
            gcTime: 10 * 60 * 1000,
            // Retry en cas d'erreur
            retry: 1,
            // Refetch au focus de la fenêtre
            refetchOnWindowFocus: true,
            // Refetch à la reconnexion
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ToastProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

