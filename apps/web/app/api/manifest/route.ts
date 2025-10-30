import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Récupérer le thème depuis les cookies ou les headers
  const theme = request.cookies.get('theme')?.value || 'light';
  const isDark = theme === 'dark';
  
  // Utiliser un logo présent dans /public/icons
  const logoSrc = '/icons/logo.png';
  
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
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "apple-touch-icon"
      },
      {
        src: "/icons/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  return NextResponse.json(manifest);
}
