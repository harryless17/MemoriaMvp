-- Vérifier le cluster et son linked_user_id
SELECT 
  id,
  cluster_label,
  status,
  linked_user_id,
  representative_face_id,
  created_at
FROM face_persons
WHERE event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'
  AND id = '4cc35a50-22ad-4f4e-aab7-1ca5190508f3';
