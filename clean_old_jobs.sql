-- Nettoyer tous les vieux jobs detect qui bloquent le système
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status = 'pending';

-- Nettoyer aussi les jobs detect completed/failed de plus de 1 jour
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status IN ('completed', 'failed')
AND created_at < NOW() - INTERVAL '1 day';

-- Afficher le résultat
SELECT 
  job_type,
  status,
  COUNT(*) as count
FROM ml_jobs
GROUP BY job_type, status
ORDER BY job_type, status;

