'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export function Logo({ 
  className = "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl", 
  alt = "Memoria Logo",
  width,
  height
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Pendant le chargement, utiliser le logo par défaut
    return (
      <img 
        src="/logo.png" 
        alt={alt} 
        className={className}
        width={width}
        height={height}
      />
    );
  }

  // Déterminer le logo à utiliser selon le thème
  const logoSrc = resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-white.png';

  return (
    <img 
      src={logoSrc} 
      alt={alt} 
      className={className}
      width={width}
      height={height}
    />
  );
}
