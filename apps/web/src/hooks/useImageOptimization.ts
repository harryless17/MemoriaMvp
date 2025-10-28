import { useState, useEffect } from 'react';

export interface ImageOptimizationConfig {
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  quality: 'low' | 'medium' | 'high' | 'original';
  format?: 'webp' | 'jpeg' | 'png';
}

export function useImageOptimization() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Vérifier si le navigateur supporte WebP
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    setIsSupported(checkWebPSupport());
  }, []);

  const getOptimizedUrl = (
    originalUrl: string, 
    config: ImageOptimizationConfig
  ): string => {
    if (!originalUrl) return originalUrl;

    // Si ce n'est pas une URL Supabase, retourner l'original
    if (!originalUrl.includes('supabase')) {
      return originalUrl;
    }

    const params = new URLSearchParams();
    
    // Configuration des tailles
    const sizeConfig = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 300, height: 300 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 },
      original: { width: null, height: null }
    };

    const size = sizeConfig[config.size];
    if (size.width) params.set('width', size.width.toString());
    if (size.height) params.set('height', size.height.toString());

    // Configuration de la qualité
    const qualityConfig = {
      low: 50,
      medium: 70,
      high: 85,
      original: 100
    };

    const quality = qualityConfig[config.quality];
    if (quality < 100) params.set('quality', quality.toString());

    // Format (WebP si supporté)
    if (config.format === 'webp' && isSupported) {
      params.set('format', 'webp');
    }

    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${params.toString()}`;
  };

  const getThumbnailUrl = (originalUrl: string): string => {
    return getOptimizedUrl(originalUrl, {
      size: 'thumbnail',
      quality: 'medium',
      format: 'webp'
    });
  };

  const getPreviewUrl = (originalUrl: string): string => {
    return getOptimizedUrl(originalUrl, {
      size: 'medium',
      quality: 'medium',
      format: 'webp'
    });
  };

  const getFullSizeUrl = (originalUrl: string): string => {
    return getOptimizedUrl(originalUrl, {
      size: 'large',
      quality: 'high',
      format: 'webp'
    });
  };

  return {
    isSupported,
    getOptimizedUrl,
    getThumbnailUrl,
    getPreviewUrl,
    getFullSizeUrl
  };
}
