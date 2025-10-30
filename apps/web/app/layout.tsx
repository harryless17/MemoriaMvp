import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Footer } from '@/components/Footer';
import { InstallPWA } from '@/components/InstallPWA';
import { NotificationListener } from '@/components/NotificationListener';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { FaviconManager } from '@/components/FaviconManager';
import { ToastProvider } from '@/components/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'Memoria - Partagez vos moments d\'événements',
  description: 'Capturez et partagez photos et vidéos d\'événements avec vos proches. IA de reconnaissance faciale incluse.',
  manifest: '/api/manifest',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  applicationName: 'Memoria',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Memoria',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/logo.png', sizes: 'any', type: 'image/png' },
      { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [
      { url: '/favicon.ico' },
    ],
  },
  openGraph: {
    title: 'Memoria - Partagez vos moments d\'événements',
    description: 'Capturez et partagez photos et vidéos d\'événements avec vos proches. IA de reconnaissance faciale incluse.',
    images: ['/icons/logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memoria - Partagez vos moments d\'événements',
    description: 'Capturez et partagez photos et vidéos d\'événements avec vos proches. IA de reconnaissance faciale incluse.',
    images: ['/icons/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Memoria" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/favicon.png?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            <FaviconManager />
            <NotificationListener />
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <InstallPWA />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

