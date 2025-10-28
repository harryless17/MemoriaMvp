'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDashboardStats, useRecentEvents } from '@/hooks/useDashboard';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { 
  Calendar, 
  Image as ImageIcon, 
  Tag, 
  Bell, 
  Users,
  Loader2,
  Crown,
  UserCog,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardPage() {
  const router = useRouter();
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

  // Use React Query hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats(userId || '');
  const { data: recentEvents, isLoading: eventsLoading } = useRecentEvents(userId || '', 4);
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(userId || '');

  // Debug logs
  useEffect(() => {
    console.log('📊 Dashboard - Recent Events:', {
      recentEvents,
      eventsLoading,
      count: recentEvents?.length || 0
    });
  }, [recentEvents, eventsLoading]);

  // Show loading state
  if (!userId || statsLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
      </div>
    );
  }

  // Trier pour afficher les non lues en premier, puis limiter à 5
  const recentNotifications = notifications
    ?.sort((a: any, b: any) => {
      // Non lues en premier
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      // Puis par date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative container mx-auto px-4 pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-12 max-w-[1600px]">

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Total Events - Large Card */}
          <div className="group relative md:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8 hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 group-hover:scale-110 transition-all duration-500">
                  <Calendar className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-bold">+2</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-5xl md:text-6xl font-black bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {stats?.eventsCount || 0}
                </p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {stats?.eventsCount === 1 ? 'Événement' : 'Événements'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cette semaine</p>
              </div>
            </div>
          </div>

          {/* Total Media - Compact Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/50 w-fit mb-4 group-hover:scale-110 transition-transform duration-500">
                <Tooltip content="Total des photos et vidéos uploadées">
                  <ImageIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Tooltip>
              </div>
              <p className="text-4xl font-black bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
                {stats?.mediaCount || 0}
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Médias uploadés</p>
            </div>
          </div>

          {/* Total Tagged */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-emerald-500/5 hover:shadow-2xl hover:shadow-emerald-500/10">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/50 w-fit mb-4 group-hover:scale-110 transition-transform duration-500">
                <Tooltip content="Photos dans lesquelles vous êtes taggé(e)">
                  <Tag className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Tooltip>
              </div>
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-2">
                {stats?.taggedCount || 0}
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Photos taggées</p>
            </div>
          </div>

          {/* Notifications */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-orange-500/5 hover:shadow-2xl hover:shadow-orange-500/10">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/50 w-fit mb-4 group-hover:scale-110 transition-transform duration-500 relative">
                <Tooltip content="Notifications non lues (ajouts d'événements, tags, etc.)">
                  <Bell className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Tooltip>
                {(stats?.unreadNotifications || 0) > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                    <span className="text-[10px] font-bold text-white">{stats?.unreadNotifications}</span>
                  </div>
                )}
              </div>
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-br from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-2">
                {stats?.unreadNotifications || 0}
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Non lues</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Recent Events - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-6">

            {eventsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : recentEvents && recentEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {recentEvents.map((event: any) => {
                  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                  const thumbnailUrl = event.firstMediaPath 
                    ? `${supabaseUrl}/storage/v1/object/public/media/${event.firstMediaPath}`
                    : null;

                  return (
                    <Link key={event.id} href={`/e/${event.id}`}>
                      <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                        <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl">
                          {/* Thumbnail */}
                          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-800 dark:to-indigo-900">
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="w-16 h-16 text-white drop-shadow-2xl" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                          </div>

                          {/* Content */}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h3 className="font-black text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                {event.title}
                              </h3>
                              {event.myRole === 'owner' && (
                                <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
                              )}
                              {event.myRole === 'co-organizer' && (
                                <UserCog className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm">
                              <Tooltip content="Nombre de photos et vidéos">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                  <ImageIcon className="w-4 h-4" />
                                  <span className="font-semibold">{event.mediaCount || 0}</span>
                                </div>
                              </Tooltip>
                              <Tooltip content="Nombre de participants">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                  <Users className="w-4 h-4" />
                                  <span className="font-semibold">{event.membersCount || 0}</span>
                                </div>
                              </Tooltip>
                              {event.myRole === 'participant' ? (
                                <Tooltip content="Photos dans lesquelles vous êtes taggé(e)">
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 ml-auto">
                                    <Tag className="w-4 h-4" />
                                    <span className="font-bold">{event.taggedCount || 0}</span>
                                  </div>
                                </Tooltip>
                              ) : event.taggedCount > 0 ? (
                                <Tooltip content="Photos encore à taguer">
                                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 ml-auto">
                                    <Zap className="w-4 h-4" />
                                    <span className="font-bold">{event.taggedCount}</span>
                                  </div>
                                </Tooltip>
                              ) : (
                                <Tooltip content="Toutes les photos sont taggées">
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 ml-auto">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="font-bold text-xs">Complet</span>
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-3xl blur-xl opacity-50" />
                <div className="relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-3xl p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-3">Aucun événement récent</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">Créez votre premier événement pour commencer</p>
                  <Link href="/events/new">
                    <Button size="lg" className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Créer un événement
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {notificationsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : recentNotifications.length > 0 ? (
              <>
                {/* Header avec compteur et "Voir tout" */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Activité récente
                    {notifications && notifications.length > 5 && (
                      <span className="ml-2 text-sm font-semibold text-slate-500">
                        ({notifications.filter((n: any) => !n.is_read).length} non lues)
                      </span>
                    )}
                  </h3>
                  {notifications && notifications.length > 5 && (
                    <button
                      onClick={() => {
                        // Toggle pour afficher/masquer toutes les notifications
                        const container = document.getElementById('all-notifications');
                        if (container) {
                          container.classList.toggle('hidden');
                        }
                      }}
                      className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Voir tout ({notifications.length})
                    </button>
                  )}
                </div>

                {/* Notifications récentes (5 premières) */}
                <div className="space-y-3">
                  {recentNotifications.map((notif: any) => {
                  const eventLink = notif.event_id ? `/e/${notif.event_id}` : null;
                  
                  const notificationContent = (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <div className={`w-2 h-2 rounded-full shadow-lg ${
                          !notif.is_read 
                            ? 'bg-blue-600 ring-4 ring-blue-600/20 animate-pulse' 
                            : 'bg-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">
                          {notif.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  );

                  return eventLink ? (
                    <Link key={notif.id} href={eventLink}>
                      <div className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                        !notif.is_read 
                          ? 'shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20' 
                          : 'shadow-lg hover:shadow-xl'
                      }`}>
                        {notificationContent}
                      </div>
                    </Link>
                  ) : (
                    <div key={notif.id} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 ${
                      !notif.is_read ? 'shadow-xl shadow-blue-500/10' : 'shadow-lg'
                    }`}>
                      {notificationContent}
                    </div>
                  );
                })}
              </div>

              {/* Toutes les notifications (masqué par défaut) */}
              {notifications && notifications.length > 5 && (
                <div id="all-notifications" className="hidden space-y-3 mt-6 pt-6 border-t border-white/20 dark:border-white/10">
                  <h4 className="text-md font-black text-slate-900 dark:text-white mb-4">
                    Toutes les notifications
                  </h4>
                  <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {notifications.slice(5).map((notif: any) => {
                      const eventLink = notif.event_id ? `/e/${notif.event_id}` : null;
                      
                      const notificationContent = (
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 pt-1">
                            <div className={`w-2 h-2 rounded-full shadow-lg ${
                              !notif.is_read 
                                ? 'bg-blue-600 ring-4 ring-blue-600/20 animate-pulse' 
                                : 'bg-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">
                              {notif.title}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">
                              {formatDistanceToNow(new Date(notif.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          </div>
                        </div>
                      );

                      return eventLink ? (
                        <Link key={notif.id} href={eventLink}>
                          <div className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                            !notif.is_read 
                              ? 'shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20' 
                              : 'shadow-lg hover:shadow-xl'
                          }`}>
                            {notificationContent}
                          </div>
                        </Link>
                      ) : (
                        <div key={notif.id} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 ${
                          !notif.is_read ? 'shadow-xl shadow-blue-500/10' : 'shadow-lg'
                        }`}>
                          {notificationContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center">
                  <Bell className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
