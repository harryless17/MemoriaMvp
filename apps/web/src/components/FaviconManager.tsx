'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function FaviconManager() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Fonction simple pour mettre à jour les favicons selon le thème
    const updateFavicons = () => {
      const isDark = resolvedTheme === 'dark';
      const logoSrc = '/favicon.png?v=2'; // Always use favicon.png with version
      
      // Mettre à jour seulement les liens existants
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = logoSrc;
      }
      
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleIcon) {
        appleIcon.href = logoSrc;
      }
      
      const shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      if (shortcutIcon) {
        shortcutIcon.href = logoSrc;
      }
    };

    // Mettre à jour les favicons quand le thème change
    updateFavicons();
  }, [resolvedTheme]);

  return null; // Ce composant ne rend rien
}
