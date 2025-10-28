'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { NotificationBell } from './NotificationBell';
import { Moon, Sun, LogOut, Menu, X, Calendar, Plus, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { Profile } from '@memoria/ui';
import { getUserDisplayName } from '@/lib/userHelpers';
import { Logo } from './Logo';

interface UnifiedNavbarProps {
  showBackButton?: boolean;
  backHref?: string;
}

export function UnifiedNavbar({ 
  showBackButton = false, 
  backHref = '/landing' 
}: UnifiedNavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      // Ensure profile exists (but don't overwrite existing display_name!)
      if (session?.user) {
        // Check if profile exists first
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', session.user.id)
          .single();

        // Only create if profile doesn't exist
        if (!existingProfile) {
          await (supabase.from('profiles') as any).insert({
            id: session.user.id,
            display_name: session.user.user_metadata?.full_name || session.user.email,
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
        
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadProfile(user.id);
    }
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Détermine si on est en mode connecté ou non
  const isAuthenticated = mounted && user;

  return (
    <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4">
      <div className="container mx-auto max-w-[1600px]">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="flex h-20 sm:h-24 items-center justify-between px-3 sm:px-6">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Memoria Logo */}
              <Link 
                href={isAuthenticated ? "/dashboard" : "/"} 
                className="group flex items-center gap-3 hover:scale-105 transition-all duration-500"
              >
                {/* Logo Image */}
                <div className="relative">
                  <Logo 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-500"
                    alt="Memoria Logo"
                  />
                  {/* Glow effect */}
                  <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                </div>
              </Link>
              
              {/* Navigation pour mode connecté */}
              {isAuthenticated && (
                <div className="hidden md:flex">
                  <Link 
                    href="/events" 
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-all duration-300"
                  >
                    <Calendar className="w-4 h-4" strokeWidth={2.5} />
                    Événements
                  </Link>
                </div>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notifications - seulement en mode connecté */}
              {isAuthenticated && <NotificationBell />}
              
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 sm:p-2.5 hover:bg-white/40 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105"
                aria-label="Toggle theme"
              >
                {mounted && theme === 'dark' ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                )}
              </button>

              {/* Desktop user menu */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    {/* Create Event Button */}
                    <Link href="/events/new">
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        <span className="hidden lg:inline">Créer</span>
                      </button>
                    </Link>

                    {/* User Avatar/Menu */}
                    <Link 
                      href="/profile/edit" 
                      className="group hover:scale-105 transition-transform duration-300"
                      title="Mon profil"
                    >
                      <Avatar 
                        src={profile?.avatar_url || null}
                        name={getUserDisplayName({ display_name: profile?.display_name, email: user?.email })}
                        size="md"
                        className="group-hover:shadow-xl group-hover:border-white/40 transition-all duration-300"
                      />
                    </Link>

                    {/* Sign Out */}
                    <button 
                      onClick={handleSignOut}
                      className="p-2.5 hover:bg-red-500/10 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      <LogOut className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Mode non connecté - boutons auth */}
                    <Link 
                      href="/login" 
                      className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-all duration-300"
                    >
                      Se connecter
                    </Link>
                    <Link href="/signup">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
                      >
                        S'inscrire
                      </Button>
                    </Link>
                    {showBackButton && (
                      <Link href={backHref}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-white/40 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:scale-105 transition-all duration-300"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Retour
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 sm:p-2.5 hover:bg-white/40 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 space-y-3 animate-in slide-in-from-top duration-200">
              {isAuthenticated ? (
                <>
                  {/* Mobile menu pour mode connecté */}
                  <Link 
                    href="/events" 
                    className="flex items-center gap-4 py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 border border-blue-200/30 dark:border-blue-700/30 rounded-xl transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-blue-700 dark:text-blue-300">
                        Mes Événements
                      </span>
                      <span className="text-sm text-blue-500/70 dark:text-blue-400/70">
                        Gérez vos moments
                      </span>
                    </div>
                  </Link>

                  <Link 
                    href="/events/new" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    <span>Créer un événement</span>
                  </Link>

                  <Link 
                    href="/profile/edit" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 font-semibold transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Avatar 
                      src={profile?.avatar_url}
                      name={getUserDisplayName({ display_name: profile?.display_name, email: user.email })}
                      size="md"
                    />
                    <span>Mon profil</span>
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold transition-all duration-300"
                  >
                    <LogOut className="w-5 h-5" strokeWidth={2.5} />
                    <span>Se déconnecter</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Mobile menu pour mode non connecté */}
                  <Link 
                    href="/login" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 font-semibold transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Se connecter</span>
                  </Link>
                  
                  <Link 
                    href="/signup" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>S'inscrire</span>
                  </Link>
                  
                  {showBackButton && (
                    <Link 
                      href={backHref}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 font-semibold transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                      <span>Retour</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
