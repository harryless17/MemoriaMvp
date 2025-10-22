-- =====================================================
-- ANALYSE COMPLÈTE DES CLUSTERS ET FACES
-- =====================================================

-- 1️⃣ Vue d'ensemble des clusters
SELECT 
  id,
  status,
  cluster_label,
  linked_user_id,
  created_at,
  (SELECT COUNT(*) FROM faces WHERE face_person_id = face_persons.id) as faces_count,
  metadata->>'is_singleton' as is_singleton,
  metadata->>'face_count' as metadata_face_count
FROM face_persons
ORDER BY created_at DESC;

-- 2️⃣ Distribution des faces par cluster
SELECT 
  fp.cluster_label,
  fp.status,
  fp.metadata->>'is_singleton' as is_singleton,
  COUNT(f.id) as actual_faces_count,
  ARRAY_AGG(f.media_id) as media_ids
FROM face_persons fp
LEFT JOIN faces f ON f.face_person_id = fp.id
GROUP BY fp.id, fp.cluster_label, fp.status, fp.metadata
ORDER BY fp.cluster_label;

-- 3️⃣ Vérifier les doublons de faces (même media_id)
SELECT 
  media_id,
  COUNT(*) as faces_per_media,
  ARRAY_AGG(id) as face_ids,
  ARRAY_AGG(face_person_id) as assigned_clusters
FROM faces
GROUP BY media_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 4️⃣ Historique des jobs ML
SELECT 
  id,
  job_type,
  status,
  created_at,
  completed_at,
  error,
  result->>'new_clusters_created' as new_clusters,
  result->>'noise_faces' as noise_faces,
  result->>'total_faces' as total_faces
FROM ml_jobs
ORDER BY created_at DESC
LIMIT 10;

-- 5️⃣ Faces par media (détail complet)
SELECT 
  m.id as media_id,
  m.storage_path,
  m.created_at as media_created,
  COUNT(f.id) as faces_detected,
  ARRAY_AGG(
    jsonb_build_object(
      'face_id', f.id,
      'cluster_label', fp.cluster_label,
      'cluster_status', fp.status,
      'quality', f.quality_score
    )
  ) as faces_detail
FROM media m
LEFT JOIN faces f ON f.media_id = m.id
LEFT JOIN face_persons fp ON fp.id = f.face_person_id
GROUP BY m.id, m.storage_path, m.created_at
ORDER BY COUNT(f.id) DESC, m.created_at DESC;

-- 6️⃣ Statistiques globales
SELECT 
  'Total media' as metric,
  COUNT(*)::text as value
FROM media
UNION ALL
SELECT 
  'Total faces',
  COUNT(*)::text
FROM faces
UNION ALL
SELECT 
  'Faces assigned',
  COUNT(*)::text
FROM faces
WHERE face_person_id IS NOT NULL
UNION ALL
SELECT 
  'Faces unassigned',
  COUNT(*)::text
FROM faces
WHERE face_person_id IS NULL
UNION ALL
SELECT 
  'Total clusters',
  COUNT(*)::text
FROM face_persons
UNION ALL
SELECT 
  'Clusters pending',
  COUNT(*)::text
FROM face_persons
WHERE status = 'pending'
UNION ALL
SELECT 
  'Clusters linked',
  COUNT(*)::text
FROM face_persons
WHERE status = 'linked';

