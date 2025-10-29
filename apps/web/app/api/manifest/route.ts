import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Récupérer le thème depuis les cookies ou les headers
  const theme = request.cookies.get('theme')?.value || 'light';
  const isDark = theme === 'dark';
  
  const logoSrc = isDark ? '/logo-dark.png' : '/logo-white.png';
  
  const manifest = {
    name: "Memoria - Partagez vos moments d'événements",
    short_name: "Memoria",
    description: "Capturez et partagez photos et vidéos d'événements avec vos proches. IA de reconnaissance faciale incluse.",
    start_url: "/",
    display: "standalone",
    background_color: isDark ? "#000000" : "#ffffff",
    theme_color: "#8b5cf6",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: logoSrc,
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      }
    ],
    categories: ["photo", "social", "lifestyle"],
    shortcuts: [
      {
        name: "Upload Media",
        short_name: "Upload",
        description: "Upload photos or videos",
        url: "/upload",
        icons: [
          {
            src: "/icons/favicon-96x96.png",
            sizes: "96x96"
          }
        ]
      },
      {
        name: "Create Event",
        short_name: "New Event",
        description: "Create a new event",
        url: "/events/new",
        icons: [
          {
            src: "/icons/favicon-96x96.png",
            sizes: "96x96"
          }
        ]
      },
      {
        name: "My Events",
        short_name: "Events",
        description: "View your events",
        url: "/my-events",
        icons: [
          {
            src: "/icons/favicon-96x96.png",
            sizes: "96x96"
          }
        ]
      }
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "1170x2532",
        type: "image/png",
        form_factor: "narrow"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
