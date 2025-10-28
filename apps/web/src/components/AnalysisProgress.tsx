'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface AnalysisProgressProps {
  isAnalyzing: boolean
  eventId: string
  onComplete: () => void
  onError: (error: string) => void
}

export function AnalysisProgress({ isAnalyzing, eventId, onComplete, onError }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null)
  const [totalMedia, setTotalMedia] = useState(0)

  // Fonctions utilitaires pour le formatage du temps
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getElapsedTime = () => {
    if (!startTime) return 0;
    return (Date.now() - startTime) / 1000;
  };

  const getEstimatedTimeRemaining = () => {
    if (!estimatedDuration) return null;
    const elapsed = getElapsedTime();
    const remaining = estimatedDuration - elapsed;
    return Math.max(0, remaining);
  };

  useEffect(() => {
    if (!isAnalyzing) return

    // Initialiser le timer
    setStartTime(Date.now())
    
    // Charger le nombre de médias pour estimer la durée
    const loadMediaCount = async () => {
      const { count } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('type', 'photo')
      
      const mediaCount = count || 0
      setTotalMedia(mediaCount)
      
      // Estimation basée sur le nombre de photos (2-5 secondes par photo)
      const estimatedMinutes = Math.max(2, Math.min(10, Math.ceil(mediaCount / 5)))
      setEstimatedDuration(estimatedMinutes * 60) // Convertir en secondes
    }
    
    loadMediaCount()

    let progressValue = 0
    let checkCount = 0
    const maxChecks = 300 // Max 5 minutes (300 * 1000ms)

    const interval = setInterval(async () => {
      checkCount++

      // Vérifier le statut réel du job dans la base de données
      const { data: jobs, error } = await supabase
        .from('ml_jobs')
        .select('status, error, result')
        .eq('event_id', eventId)
        .eq('job_type', 'cluster')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error checking job status:', error)
      }

      if (jobs && jobs.length > 0) {
        const job = jobs[0] as any

        if (job.status === 'completed') {
          clearInterval(interval)
          setProgress(100)
          setStatus('Analyse terminée !')
          setIsComplete(true)
          setTimeout(() => {
            onComplete()
          }, 1000)
          return
        } else if (job.status === 'failed') {
          clearInterval(interval)
          setStatus('Erreur lors de l\'analyse')
          onError(job.error || 'Unknown error')
          return
        } else if (job.status === 'processing') {
          // Progression basée sur le temps écoulé et l'estimation
          const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0
          const estimated = estimatedDuration || 120 // 2 minutes par défaut
          
          // Progression plus réaliste basée sur le temps
          const timeBasedProgress = Math.min((elapsed / estimated) * 100, 90)
          
          // Ne pas permettre de régression
          if (timeBasedProgress > progressValue) {
            progressValue = timeBasedProgress
          } else {
            // Progression lente si on stagne
            progressValue = Math.min(progressValue + 0.5, 90)
          }
          
          setProgress(Math.round(progressValue))
          setStatus('Clustering intelligent...')
        } else {
          // En attente
          progressValue = Math.min(progressValue + 2, 30)
          setProgress(progressValue)
          setStatus('En attente de traitement...')
        }
      } else {
        // Pas de job trouvé, progression initiale
        progressValue = Math.min(progressValue + 3, 20)
        setProgress(progressValue)
        setStatus('Initialisation...')
      }

      // Timeout après 5 minutes
      if (checkCount >= maxChecks) {
        clearInterval(interval)
        setStatus('Analyse en cours... (Actualisez la page)')
        onError('Timeout')
      }
    }, 1000) // Vérifier toutes les secondes

    return () => {
      clearInterval(interval)
    }
  }, [isAnalyzing, eventId, onComplete, onError, startTime, estimatedDuration])

  if (!isAnalyzing && !isComplete) return null

  const estimatedTimeRemaining = getEstimatedTimeRemaining();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-sm mx-4">
        <div className="text-center">
          {isComplete ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          ) : (
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          )}
          
          <h3 className="text-lg font-semibold mb-2">
            {isComplete ? 'Analyse terminée !' : 'Analyse des visages'}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {status}
          </p>

          {/* Informations sur les médias */}
          {totalMedia > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📸 Analyse de {totalMedia} photos
              </p>
            </div>
          )}

          {/* Timer et progression */}
          {!isComplete && (
            <div className="space-y-3 mb-4">
              {/* Temps restant estimé */}
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      ⏱️ Temps restant estimé
                    </span>
                  </div>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatTime(estimatedTimeRemaining)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Temps écoulé: {formatTime(getElapsedTime())}
                  </p>
                </div>
              )}

              {/* Barre de progression */}
              <div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>
          )}

          {/* Progression simple si terminé */}
          {isComplete && (
            <div className="mb-4">
              <Progress value={100} className="w-full" />
              <p className="text-xs text-gray-500 mt-1">
                100%
              </p>
            </div>
          )}
          
          {isComplete && (
            <Button 
              onClick={onComplete}
              className="w-full"
            >
              Continuer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
