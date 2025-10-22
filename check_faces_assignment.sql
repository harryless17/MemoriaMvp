-- Vérifier les faces et leurs assignations
SELECT 
  f.id,
  LEFT(f.media_id::text, 8) as media_id_short,
  f.face_person_id,
  fp.status as cluster_status,
  fp.linked_user_id
FROM faces f
LEFT JOIN face_persons fp ON f.face_person_id = fp.id
WHERE f.media_id IN (
  SELECT id FROM media 
  WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
)
ORDER BY f.created_at DESC
LIMIT 20;
