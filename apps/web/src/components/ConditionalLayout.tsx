'use client'

import { usePathname } from 'next/navigation'
import { UnifiedNavbar } from './UnifiedNavbar'
import { Footer } from './Footer'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Routes marketing qui ont besoin de bouton retour
  const isMarketingRoute = pathname === '/landing' || pathname === '/signup' || pathname === '/demo' || pathname === '/login'
  
  // Détermine si on doit afficher le bouton retour
  const showBackButton = isMarketingRoute && pathname !== '/landing'
  const backHref = pathname === '/login' || pathname === '/signup' ? '/landing' : '/landing'
  
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedNavbar 
        showBackButton={showBackButton}
        backHref={backHref}
      />
      <main className="flex-1">{children}</main>
      {/* Footer seulement pour les routes non marketing */}
      {!isMarketingRoute && <Footer />}
    </div>
  )
}
