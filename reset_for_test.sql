-- 1. Supprimer tous les jobs detect pending
DELETE FROM ml_jobs WHERE job_type = 'detect' AND status = 'pending';

-- 2. Supprimer les faces des 3 nouvelles photos
DELETE FROM faces 
WHERE media_id IN (
  SELECT id FROM media 
  WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
  ORDER BY created_at DESC 
  LIMIT 3
);

-- 3. Vérifier l'état
SELECT 
  'Total media' as type,
  COUNT(*) as count
FROM media 
WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
UNION ALL
SELECT 
  'Media with faces' as type,
  COUNT(DISTINCT media_id) as count
FROM faces 
WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef';
