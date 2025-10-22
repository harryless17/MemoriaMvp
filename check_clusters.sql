-- Vérifier les clusters créés avec leurs détails
SELECT 
  fp.id,
  fp.cluster_id,
  fp.quality_score,
  fp.representative_face_id,
  f.media_id,
  f.bbox,
  m.storage_path
FROM face_persons fp
LEFT JOIN faces f ON fp.representative_face_id = f.id
LEFT JOIN media m ON f.media_id = m.id
WHERE fp.event_id = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef';
