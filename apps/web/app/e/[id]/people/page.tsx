'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Brain, Hand, Loader2, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

// Import views
import { AITaggingView } from '@/components/people/AITaggingView';
import { ManualTaggingView } from '@/components/people/ManualTaggingView';

export default function PeoplePage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPhotos: 0,
    taggedPhotos: 0,
    detectedFaces: 0,
    identifiedClusters: 0,
  });

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      setLoading(true);

      // Load event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Load stats
      await loadStats();

      // Auto-select mode based on face_recognition_enabled
      if ((eventData as any).face_recognition_enabled) {
        setMode('ai');
      } else {
        setMode('manual');
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    // Count total photos
    const { count: totalPhotos } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // Count tagged photos
    const { data: allMedia } = await supabase
      .from('media')
      .select('id')
      .eq('event_id', eventId);

    const { data: taggedMedia } = await supabase
      .from('media_tags')
      .select('media_id')
      .in('media_id', allMedia?.map((m: any) => m.id) || []);

    const taggedMediaIds = new Set(taggedMedia?.map((t: any) => t.media_id) || []);
    const taggedCount = taggedMediaIds.size;

    // Count detected faces
    const { count: detectedFaces } = await supabase
      .from('faces')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // Count identified clusters
    const { count: identifiedClusters } = await supabase
      .from('face_persons')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'linked');

    setStats({
      totalPhotos: totalPhotos || 0,
      taggedPhotos: taggedCount,
      detectedFaces: detectedFaces || 0,
      identifiedClusters: identifiedClusters || 0,
    });
  }

  const handleClusterAssigned = () => {
    loadStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-12">
        <p className="text-center text-muted-foreground">Événement non trouvé</p>
      </div>
    );
  }

  const completionPercentage = stats.totalPhotos > 0 
    ? Math.round((stats.taggedPhotos / stats.totalPhotos) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative container mx-auto px-4 pt-20 sm:pt-24 md:pt-28 pb-8 md:pb-12 max-w-[1600px]">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            
            {/* Title & Description */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black mb-2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  👥 Gestion des Personnes
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                {event.title}
              </p>
              
              {/* Stats bar */}
              <div className="flex flex-wrap gap-2 mt-4 text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs">
                    📸 {stats.totalPhotos}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                    ✅ {stats.taggedPhotos} ({completionPercentage}%)
                  </span>
                </div>
                {mode === 'ai' && (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-full">
                      <span className="font-semibold text-purple-700 dark:text-purple-300 text-xs">
                        🤖 {stats.detectedFaces}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-full">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-xs">
                        👤 {stats.identifiedClusters}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-xl p-1 shadow-lg">
                <button
                  onClick={() => setMode('ai')}
                  disabled={!event.face_recognition_enabled}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 rounded-lg font-bold transition-all text-xs',
                    mode === 'ai'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40',
                    !event.face_recognition_enabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Brain className="w-4 h-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">IA Automatique</span>
                  <span className="sm:hidden">IA</span>
                </button>
                
                <button
                  onClick={() => setMode('manual')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 rounded-lg font-bold transition-all text-xs',
                    mode === 'manual'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40'
                  )}
                >
                  <Hand className="w-4 h-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Manuel</span>
                  <span className="sm:hidden">Manuel</span>
                </button>
              </div>

              {/* Helper text */}
              {mode === 'ai' && !event.face_recognition_enabled && (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-orange-700 dark:text-orange-300">
                      La reconnaissance faciale n'est pas activée pour cet événement. Utilisez le mode manuel.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Progression du tagging
              </span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {completionPercentage}%
              </span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completionPercentage === 100
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                )}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {completionPercentage === 100 && (
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2 text-center">
                ✨ Toutes les photos sont taguées ! Les participants peuvent maintenant voir leurs souvenirs.
              </p>
            )}
          </div>
        </div>

        {/* Mode explanation */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              {mode === 'ai' ? (
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Mode IA Automatique
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    L'intelligence artificielle détecte et regroupe automatiquement les visages similaires. 
                    Vous validez simplement les clusters et assignez-les aux participants. 
                    Gain de temps : <strong>jusqu'à 90%</strong>.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Mode Manuel
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Sélectionnez manuellement les photos et les participants à taguer. 
                    Plus de contrôle, idéal pour les petits événements ou les corrections précises.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Content based on mode */}
        <div className="min-h-[600px]">
          {mode === 'ai' ? (
            <AITaggingView 
              eventId={eventId} 
              onStatsUpdate={handleClusterAssigned}
            />
          ) : (
            <ManualTaggingView 
              eventId={eventId}
              onStatsUpdate={handleClusterAssigned}
            />
          )}
        </div>

      </div>

    </div>
  );
}
