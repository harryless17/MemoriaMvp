'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  quality?: 'low' | 'medium' | 'high' | 'original';
  size?: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

// Configuration des tailles et qualités
const SIZE_CONFIG = {
  thumbnail: { width: 150, height: 150, quality: 60 },
  small: { width: 300, height: 300, quality: 70 },
  medium: { width: 600, height: 600, quality: 80 },
  large: { width: 1200, height: 1200, quality: 90 },
  original: { width: null, height: null, quality: 100 }
};

export function OptimizedImage({ 
  src, 
  alt, 
  className,
  quality = 'medium',
  size = 'medium',
  onLoad,
  onError,
  onClick
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Générer l'URL optimisée
  useEffect(() => {
    if (!src) return;

    // Si c'est déjà une URL Supabase, on peut ajouter des paramètres de transformation
    if (src.includes('supabase')) {
      const config = SIZE_CONFIG[size];
      const params = new URLSearchParams();
      
      if (config.width) params.set('width', config.width.toString());
      if (config.height) params.set('height', config.height.toString());
      if (config.quality < 100) params.set('quality', config.quality.toString());
      
      // Ajouter le paramètre de transformation pour Supabase Storage
      const separator = src.includes('?') ? '&' : '?';
      setOptimizedSrc(`${src}${separator}${params.toString()}`);
    } else {
      // Pour les autres URLs, utiliser l'image originale
      setOptimizedSrc(src);
    }
  }, [src, size]);

  // Intersection Observer pour le lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px', // Charger 100px avant d'entrer dans le viewport
        threshold: 0.1 
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={imgRef} 
      className={cn('relative overflow-hidden', className)}
      onClick={onClick}
    >
      {/* Placeholder avec skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* État d'erreur */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 mx-auto mb-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p className="text-xs">Erreur de chargement</p>
          </div>
        </div>
      )}

      {/* Image optimisée */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-auto object-cover transition-all duration-300',
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          )}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}