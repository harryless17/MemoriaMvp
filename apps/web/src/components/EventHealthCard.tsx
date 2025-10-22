'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from './ui/button';
import { 
  CheckCircle2, 
  Circle,
  Upload,
  Users,
  Brain,
  Tag,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventHealthCardProps {
  eventId: string;
  className?: string;
}

interface EventStats {
  membersCount: number;
  mediaCount: number;
  facesDetected: number;
  untaggedCount: number;
  faceRecognitionEnabled: boolean;
}

export function EventHealthCard({ eventId, className }: EventHealthCardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<EventStats>({
    membersCount: 0,
    mediaCount: 0,
    facesDetected: 0,
    untaggedCount: 0,
    faceRecognitionEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [eventId]);

  async function loadStats() {
    try {
      setLoading(true);

      // Get event info
      const { data: event } = await supabase
        .from('events')
        .select('face_recognition_enabled')
        .eq('id', eventId)
        .single();

      // Count members
      const { count: membersCount } = await supabase
        .from('event_members')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      // Count media
      const { count: mediaCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      // Count unique faces detected (count by bbox to avoid duplicates from multi-assignments)
      const { data: allFaces } = await supabase
        .from('faces')
        .select('media_id, bbox')
        .eq('event_id', eventId);
      
      // Group by media_id and bbox to count unique face detections (not assignment copies)
      const uniqueFacesByMediaAndBbox = new Map<string, Set<string>>();
      if (allFaces) {
        allFaces.forEach((face: any) => {
          const bboxKey = JSON.stringify(face.bbox); // Unique key for each face position
          const mediaKey = face.media_id;
          
          if (!uniqueFacesByMediaAndBbox.has(mediaKey)) {
            uniqueFacesByMediaAndBbox.set(mediaKey, new Set());
          }
          uniqueFacesByMediaAndBbox.get(mediaKey)!.add(bboxKey);
        });
      }
      
      // Count total unique faces (unique bbox per media)
      let facesDetected = 0;
      uniqueFacesByMediaAndBbox.forEach((bboxSet) => {
        facesDetected += bboxSet.size;
      });
      
      console.log('🔍 Face counting debug:', {
        totalFaceRecords: allFaces?.length || 0,
        mediaWithFaces: uniqueFacesByMediaAndBbox.size,
        uniqueFacesDetected: facesDetected
      });

      // Count untagged media
      const { data: allMedia } = await supabase
        .from('media')
        .select('id')
        .eq('event_id', eventId);

      const { data: taggedMedia } = await supabase
        .from('media_tags')
        .select('media_id')
        .in('media_id', allMedia?.map((m: any) => m.id) || []);

      const taggedMediaIds = new Set(taggedMedia?.map((t: any) => t.media_id) || []);
      const untaggedCount = (allMedia?.filter((m: any) => !taggedMediaIds.has(m.id)) || []).length;

      // Debug logs
      console.log('📊 EventHealthCard Stats:', {
        totalMedia: allMedia?.length,
        taggedMedia: taggedMedia?.length,
        uniqueTaggedMedia: taggedMediaIds.size,
        untaggedCount,
        facesDetected: facesDetected || 0
      });

      setStats({
        membersCount: membersCount || 0,
        mediaCount: mediaCount || 0,
        facesDetected: facesDetected || 0,
        untaggedCount,
        faceRecognitionEnabled: (event as any)?.face_recognition_enabled || false,
      });
    } catch (error) {
      console.error('Error loading event stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateProgress = () => {
    let progress = 0;
    
    // Has members? +20%
    if (stats.membersCount > 0) progress += 20;
    
    // Has media? +20%
    if (stats.mediaCount > 0) progress += 20;
    
    // Face detection run? +20%
    if (stats.facesDetected > 0) progress += 20;
    
    // Tagging completion +40% (proportional)
    if (stats.mediaCount > 0) {
      const taggedCount = stats.mediaCount - stats.untaggedCount;
      const taggedPercentage = (taggedCount / stats.mediaCount) * 100;
      progress += (taggedPercentage / 100) * 40;
    }
    
    return Math.round(progress);
  };

  const getNextAction = () => {
    if (stats.mediaCount === 0) {
      return {
        label: 'Uploader des photos',
        icon: Upload,
        color: 'from-blue-600 to-indigo-600',
        onClick: () => router.push(`/upload?eventId=${eventId}`)
      };
    }

    if (stats.faceRecognitionEnabled && stats.facesDetected === 0) {
      return {
        label: 'Lancer l\'analyse IA',
        icon: Brain,
        color: 'from-purple-600 to-pink-600',
        onClick: () => router.push(`/e/${eventId}/people`)
      };
    }

    if (stats.untaggedCount > 0) {
      return {
        label: 'Identifier les personnes',
        icon: Tag,
        color: 'from-emerald-600 to-teal-600',
        onClick: () => router.push(`/e/${eventId}/people`)
      };
    }

    return null;
  };

  const progress = calculateProgress();
  const nextAction = getNextAction();
  const isComplete = progress === 100;

  if (loading) {
    return (
      <div className={cn(
        'bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 animate-pulse',
        className
      )}>
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn(
      'relative group',
      className
    )}>
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-3xl blur-xl opacity-0 transition-opacity',
        isComplete 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 group-hover:opacity-20'
          : 'bg-gradient-to-r from-blue-500 to-indigo-600 group-hover:opacity-20'
      )} />

      <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-xl hover:scale-[1.01] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
              isComplete
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            )}>
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.5} />
              ) : (
                <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black">
                {isComplete ? 'Événement complet !' : 'Configuration de l\'événement'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isComplete 
                  ? 'Tous les participants peuvent voir leurs photos'
                  : `${progress}% complété`
                }
              </p>
            </div>
          </div>

          {/* Circular progress */}
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                className={cn(
                  'transition-all duration-500',
                  isComplete
                    ? 'text-green-600'
                    : 'text-blue-600'
                )}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar (alternative visual) */}
        <div className="mb-6">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isComplete
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          
          {/* Members */}
          <div className="flex items-center gap-3">
            {stats.membersCount > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2.5} />
            )}
            <span className={cn(
              'text-sm font-semibold',
              stats.membersCount > 0 
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            )}>
              {stats.membersCount > 0 
                ? `${stats.membersCount} participant${stats.membersCount > 1 ? 's' : ''} invité${stats.membersCount > 1 ? 's' : ''}`
                : 'Aucun participant invité'
              }
            </span>
          </div>

          {/* Media */}
          <div className="flex items-center gap-3">
            {stats.mediaCount > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2.5} />
            )}
            <span className={cn(
              'text-sm font-semibold',
              stats.mediaCount > 0
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            )}>
              {stats.mediaCount > 0
                ? `${stats.mediaCount} photo${stats.mediaCount > 1 ? 's' : ''} uploadée${stats.mediaCount > 1 ? 's' : ''}`
                : 'Aucune photo uploadée'
              }
            </span>
          </div>

          {/* Face detection */}
          {stats.faceRecognitionEnabled && (
            <div className="flex items-center gap-3">
              {stats.facesDetected > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" strokeWidth={2.5} />
              ) : (
                <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2.5} />
              )}
              <span className={cn(
                'text-sm font-semibold',
                stats.facesDetected > 0
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              )}>
                {stats.facesDetected > 0
                  ? `${stats.facesDetected} visage${stats.facesDetected > 1 ? 's' : ''} détecté${stats.facesDetected > 1 ? 's' : ''}`
                  : 'Analyse des visages non lancée'
                }
              </span>
            </div>
          )}

          {/* Tagging */}
          <div className="flex items-center gap-3">
            {stats.untaggedCount === 0 && stats.mediaCount > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" strokeWidth={2.5} />
            ) : stats.untaggedCount > 0 ? (
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2.5} />
            )}
            <span className={cn(
              'text-sm font-semibold',
              stats.untaggedCount === 0 && stats.mediaCount > 0
                ? 'text-green-600'
                : stats.untaggedCount > 0
                ? 'text-orange-600'
                : 'text-slate-500 dark:text-slate-400'
            )}>
              {stats.untaggedCount === 0 && stats.mediaCount > 0
                ? 'Toutes les photos sont taguées !'
                : stats.untaggedCount > 0
                ? `${stats.untaggedCount} photo${stats.untaggedCount > 1 ? 's' : ''} à taguer`
                : 'Aucune photo à taguer'
              }
            </span>
          </div>
        </div>

        {/* Next action CTA */}
        {!isComplete && nextAction && (
          <Button
            onClick={nextAction.onClick}
            className={cn(
              'w-full gap-2 bg-gradient-to-r shadow-lg transition-all group',
              'hover:brightness-110 hover:shadow-2xl',
              nextAction.color
            )}
          >
            <nextAction.icon className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span>{nextAction.label}</span>
            <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>
        )}

        {/* Complete state message */}
        {isComplete && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
            <Sparkles className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              Félicitations ! Votre événement est prêt à partager
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

