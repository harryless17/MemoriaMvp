'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
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

  useEffect(() => {
    if (!isAnalyzing) return

    let progressValue = 0
    let checkCount = 0
    const maxChecks = 60 // Max 60 secondes (60 * 1000ms)

    const interval = setInterval(async () => {
      checkCount++

      // Vérifier le statut réel du job dans la base de données
      const { data: jobs, error } = await supabase
        .from('ml_jobs')
        .select('status, error')
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
          // Progression graduelle pendant le traitement
          progressValue = Math.min(progressValue + 5, 85)
          setProgress(progressValue)
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

      // Timeout après 60 secondes
      if (checkCount >= maxChecks) {
        clearInterval(interval)
        setStatus('Analyse en cours... (Actualisez la page)')
        onError('Timeout')
      }
    }, 1000) // Vérifier toutes les secondes

    return () => {
      clearInterval(interval)
    }
  }, [isAnalyzing, eventId, onComplete, onError])

  if (!isAnalyzing && !isComplete) return null

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
            {isComplete ? 'Analyse terminée !' : 'Analyse en cours...'}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {status}
          </p>
          
          <div className="mb-4">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(progress)}%
            </p>
          </div>
          
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
