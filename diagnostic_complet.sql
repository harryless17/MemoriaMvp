-- 📊 DIAGNOSTIC COMPLET DU SYSTÈME

-- 1. État des jobs ML
SELECT 
  job_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM ml_jobs
GROUP BY job_type, status
ORDER BY job_type, status;

-- 2. État des faces
SELECT 
  CASE 
    WHEN face_person_id IS NULL THEN 'unassigned'
    ELSE 'assigned'
  END as status,
  COUNT(*) as count
FROM faces
GROUP BY status;

-- 3. État des face_persons (clusters)
SELECT 
  status,
  COUNT(*) as count,
  SUM(CASE WHEN linked_user_id IS NOT NULL THEN 1 ELSE 0 END) as linked_count
FROM face_persons
GROUP BY status;

-- 4. Détail des face_persons
SELECT 
  id,
  status,
  linked_user_id,
  created_at,
  (SELECT COUNT(*) FROM faces WHERE face_person_id = face_persons.id) as faces_count
FROM face_persons
ORDER BY created_at DESC
LIMIT 10;

-- 5. Dernières faces créées
SELECT 
  id,
  media_id,
  face_person_id,
  created_at
FROM faces
ORDER BY created_at DESC
LIMIT 10;

-- 6. État des media_tags
SELECT 
  source,
  COUNT(*) as count
FROM media_tags
GROUP BY source;

