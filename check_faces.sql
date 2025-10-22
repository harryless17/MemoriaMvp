-- Vérifier toutes les faces détectées
SELECT 
  f.id,
  f.media_id,
  f.face_person_id,
  f.quality_score,
  f.created_at,
  m.storage_path
FROM faces f
JOIN media m ON f.media_id = m.id
WHERE f.event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
ORDER BY f.created_at DESC;
