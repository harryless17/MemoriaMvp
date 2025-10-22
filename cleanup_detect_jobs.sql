-- Nettoyer TOUS les jobs detect (ils ne sont plus utilisés)
-- Le système utilise maintenant uniquement les jobs "cluster"

-- 1. Supprimer tous les jobs detect pending
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status = 'pending';

-- 2. Supprimer tous les vieux jobs detect completed/failed
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status IN ('completed', 'failed');

-- 3. Afficher ce qui reste (devrait être uniquement des jobs cluster)
SELECT 
  job_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM ml_jobs
GROUP BY job_type, status
ORDER BY job_type, status;

