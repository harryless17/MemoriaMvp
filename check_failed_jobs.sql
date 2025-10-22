-- Vérifier les jobs failed pour comprendre l'erreur

SELECT 
  id,
  job_type,
  status,
  error,
  attempts,
  created_at,
  started_at,
  completed_at
FROM ml_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;

