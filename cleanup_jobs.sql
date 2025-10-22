-- Supprimer tous les jobs detect pending (ils sont gérés par le clustering)
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
  AND status = 'pending';

-- Vérifier les jobs restants
SELECT 
  job_type,
  status,
  COUNT(*) as count
FROM ml_jobs
GROUP BY job_type, status
ORDER BY job_type, status;
