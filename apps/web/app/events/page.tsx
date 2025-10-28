'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEventsWithStats } from '@/hooks/useEventsWithStats';
interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Plus, Calendar, MapPin, Users, Image as ImageIcon, AlertTriangle, Loader2, Crown, UserCog, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EventWithRole extends Event {
  my_role: 'owner' | 'co-organizer' | 'participant';
  member_count?: number;
  media_count?: number;
  my_media_count?: number;
  untagged_count?: number;
}

export default function MyEventsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'organizing' | 'participating'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    }
    checkAuth();
  }, [router]);

  // Use React Query hook with cache
  const { data: events = [], isLoading } = useEventsWithStats(userId || '');

  const filteredEvents = events.filter(event => {
    if (filter === 'organizing') {
      return event.my_role === 'owner' || event.my_role === 'co-organizer';
    }
    if (filter === 'participating') {
      return event.my_role === 'participant';
    }
    return true;
  });

  const organizingCount = events.filter((e: any) => e.my_role === 'owner' || e.my_role === 'co-organizer').length;
  const participatingCount = events.filter((e: any) => e.my_role === 'participant').length;

  if (!userId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative container mx-auto px-4 pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-12 max-w-[1600px]">

        {/* Filters with Glassmorphism */}
        <div className="flex gap-3 mb-8 md:mb-12 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap hover:scale-105',
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
            )}
          >
            <span className="flex items-center gap-2">
              Tous 
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-black">
                {events.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setFilter('organizing')}
            className={cn(
              'px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap hover:scale-105',
              filter === 'organizing'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
            )}
          >
            <span className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Organisés
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-black">
                {organizingCount}
              </span>
            </span>
          </button>
          <button
            onClick={() => setFilter('participating')}
            className={cn(
              'px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap hover:scale-105',
              filter === 'participating'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
            )}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participant
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-black">
                {participatingCount}
              </span>
            </span>
          </button>
        </div>

        {/* Events Bento Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 stagger-fade-in">
            {filteredEvents.map((event: any) => (
              <Link key={event.id} href={`/e/${event.id}`}>
                  <div className="group relative h-full">
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  
                  <div className="relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl">
                    {/* Content */}
                    <div className="p-6">
                      {/* Role Badge */}
                      <div className="mb-4">
                        {event.my_role === 'owner' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-lg">
                            <Crown className="w-3.5 h-3.5" strokeWidth={3} />
                            Organisateur
                          </div>
                        )}
                        {event.my_role === 'co-organizer' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-black shadow-lg">
                            <UserCog className="w-3.5 h-3.5" strokeWidth={3} />
                            Co-organisateur
                          </div>
                        )}
                        {event.my_role === 'participant' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-lg">
                            <Users className="w-3.5 h-3.5" strokeWidth={3} />
                            Participant
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-black mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {/* Meta info */}
                      <div className="space-y-2 text-sm mb-5">
                        {event.date && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                            </div>
                            <span className="font-semibold">{formatDate(event.date)}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                              <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                            </div>
                            <span className="font-semibold truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="pt-5 border-t border-white/20 dark:border-white/10">
                        {event.my_role === 'participant' ? (
                          // Participant view
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Vos photos</span>
                            <Tooltip content="Photos dans lesquelles vous êtes taggé(e)">
                              <div className="flex items-center gap-2">
                                <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                                  {event.my_media_count}
                                </div>
                                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            </Tooltip>
                          </div>
                        ) : (
                          // Organizer view
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <Tooltip content="Total des photos et vidéos uploadées">
                                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4" strokeWidth={2.5} />
                                  Médias
                                </span>
                              </Tooltip>
                              <span className="text-lg font-black text-slate-900 dark:text-white">{event.media_count}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <Tooltip content="Nombre de participants">
                                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                  <Users className="w-4 h-4" strokeWidth={2.5} />
                                  Membres
                                </span>
                              </Tooltip>
                              <span className="text-lg font-black text-slate-900 dark:text-white">{event.member_count}</span>
                            </div>
                            {event.untagged_count !== undefined && event.untagged_count > 0 && (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                                <Tooltip content="Photos qui nécessitent encore des tags">
                                  <span className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                    <Zap className="w-4 h-4" strokeWidth={2.5} />
                                    À taguer
                                  </span>
                                </Tooltip>
                                <span className="text-xl font-black text-orange-600 dark:text-orange-400">{event.untagged_count}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-3xl blur-2xl opacity-30" />
            <div className="relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-3xl p-16 md:p-24 text-center">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Calendar className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-4">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {filter === 'all' && "Aucun événement"}
                  {filter === 'organizing' && "Vous n'organisez aucun événement"}
                  {filter === 'participating' && "Vous ne participez à aucun événement"}
                </span>
              </h3>
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Créez votre premier événement pour commencer à partager vos moments
              </p>
              <Link href="/events/new">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  Créer mon premier événement
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
