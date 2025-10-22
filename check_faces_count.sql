-- Vérifier combien de faces par media
SELECT 
  m.id as media_id,
  m.storage_path,
  COUNT(f.id) as face_count,
  f.face_person_id
FROM media m
LEFT JOIN faces f ON f.media_id = m.id
WHERE m.event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
GROUP BY m.id, m.storage_path, f.face_person_id
ORDER BY m.created_at;
