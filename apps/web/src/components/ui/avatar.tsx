'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string  // For backward compatibility
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm', 
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
}

export function Avatar({ 
  src, 
  alt, 
  name,
  fallback, 
  size = 'md', 
  className 
}: AvatarProps) {
  const displayName = name || alt || 'Utilisateur'
  
  // Extract initial from name, preferring display name over email
  const getInitial = (text: string) => {
    // If it's an email, try to extract name part before @
    if (text.includes('@')) {
      const namePart = text.split('@')[0]
      // If name part has dots, use the last part (surname)
      if (namePart.includes('.')) {
        return namePart.split('.').pop()?.charAt(0) || namePart.charAt(0)
      }
      return namePart.charAt(0)
    }
    // For regular names, use first character
    return text.charAt(0)
  }
  
  const fallbackText = fallback || getInitial(displayName).toUpperCase()
  
  return (
    <div className={cn(
      'relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
          style={{ imageOrientation: 'from-image' }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white font-bold">
            {fallbackText}
          </span>
        </div>
      )}
    </div>
  )
}