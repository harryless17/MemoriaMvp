-- =====================================================
-- SCRIPT DE RÉCUPÉRATION DES FACES ORPHELINES
-- =====================================================
-- Ce script crée des clusters singletons pour toutes les faces
-- qui ont face_person_id = NULL suite aux tests précédents
-- =====================================================

-- 1. Voir combien de faces orphelines il y a par événement
SELECT 
  event_id,
  COUNT(*) as orphan_faces_count
FROM faces
WHERE face_person_id IS NULL
GROUP BY event_id
ORDER BY orphan_faces_count DESC;

-- 2. Voir les détails des faces orphelines
SELECT 
  f.id as face_id,
  f.event_id,
  f.media_id,
  f.quality_score,
  m.storage_path,
  e.title as event_name
FROM faces f
JOIN media m ON m.id = f.media_id
JOIN events e ON e.id = f.event_id
WHERE f.face_person_id IS NULL
ORDER BY f.event_id, f.quality_score DESC;

-- =====================================================
-- 3. FONCTION POUR CRÉER DES CLUSTERS SINGLETONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_singleton_clusters_for_orphans()
RETURNS TABLE(
  event_id UUID,
  orphans_found INT,
  clusters_created INT,
  faces_assigned INT
) AS $$
DECLARE
  v_event_id UUID;
  v_face_record RECORD;
  v_next_label INT;
  v_new_cluster_id UUID;
  v_orphans_count INT;
  v_clusters_count INT := 0;
  v_faces_count INT := 0;
BEGIN
  -- Pour chaque événement avec des faces orphelines
  FOR v_event_id IN 
    SELECT DISTINCT f.event_id 
    FROM faces f 
    WHERE f.face_person_id IS NULL
  LOOP
    -- Compter les orphelins pour cet événement
    SELECT COUNT(*) INTO v_orphans_count
    FROM faces
    WHERE event_id = v_event_id AND face_person_id IS NULL;
    
    -- Trouver le prochain cluster_label disponible
    SELECT COALESCE(MAX(cluster_label), -1) + 1 INTO v_next_label
    FROM face_persons
    WHERE face_persons.event_id = v_event_id;
    
    RAISE NOTICE 'Event %, Orphans: %, Next label: %', v_event_id, v_orphans_count, v_next_label;
    
    -- Pour chaque face orpheline de cet événement
    FOR v_face_record IN 
      SELECT id, quality_score
      FROM faces
      WHERE event_id = v_event_id AND face_person_id IS NULL
      ORDER BY quality_score DESC
    LOOP
      -- Créer un nouveau cluster singleton
      INSERT INTO face_persons (
        event_id,
        cluster_label,
        status,
        representative_face_id,
        metadata
      ) VALUES (
        v_event_id,
        v_next_label,
        'pending',
        v_face_record.id,
        jsonb_build_object(
          'face_count', 1,
          'avg_quality', v_face_record.quality_score,
          'is_singleton', true,
          'created_from_cleanup', true
        )
      )
      RETURNING id INTO v_new_cluster_id;
      
      -- Assigner la face au nouveau cluster
      UPDATE faces
      SET face_person_id = v_new_cluster_id
      WHERE id = v_face_record.id;
      
      v_clusters_count := v_clusters_count + 1;
      v_faces_count := v_faces_count + 1;
      v_next_label := v_next_label + 1;
    END LOOP;
    
    -- Retourner les stats pour cet événement
    event_id := v_event_id;
    orphans_found := v_orphans_count;
    clusters_created := v_clusters_count;
    faces_assigned := v_faces_count;
    RETURN NEXT;
    
    -- Reset pour le prochain événement
    v_clusters_count := 0;
    v_faces_count := 0;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. EXÉCUTER LA FONCTION DE RÉCUPÉRATION
-- =====================================================

-- DRY RUN : Voir ce qui serait fait (commenté par défaut)
-- SELECT * FROM create_singleton_clusters_for_orphans();

-- =====================================================
-- 5. VERSION SIMPLE (SI LA FONCTION NE MARCHE PAS)
-- =====================================================
-- Uncomment les lignes ci-dessous si tu préfères une approche plus simple

/*
DO $$
DECLARE
  v_event_id UUID;
  v_face_id UUID;
  v_quality FLOAT;
  v_next_label INT;
  v_new_cluster_id UUID;
  v_total_processed INT := 0;
BEGIN
  -- Pour chaque événement avec des faces orphelines
  FOR v_event_id IN 
    SELECT DISTINCT event_id FROM faces WHERE face_person_id IS NULL
  LOOP
    RAISE NOTICE '=== Processing event: % ===', v_event_id;
    
    -- Trouver le prochain label disponible
    SELECT COALESCE(MAX(cluster_label), -1) + 1 INTO v_next_label
    FROM face_persons WHERE event_id = v_event_id;
    
    -- Pour chaque face orpheline
    FOR v_face_id, v_quality IN 
      SELECT id, quality_score FROM faces 
      WHERE event_id = v_event_id AND face_person_id IS NULL
      ORDER BY quality_score DESC
    LOOP
      -- Créer cluster
      INSERT INTO face_persons (event_id, cluster_label, status, representative_face_id, metadata)
      VALUES (
        v_event_id, 
        v_next_label, 
        'pending', 
        v_face_id,
        jsonb_build_object('face_count', 1, 'avg_quality', v_quality, 'is_singleton', true, 'created_from_cleanup', true)
      )
      RETURNING id INTO v_new_cluster_id;
      
      -- Assigner face
      UPDATE faces SET face_person_id = v_new_cluster_id WHERE id = v_face_id;
      
      v_next_label := v_next_label + 1;
      v_total_processed := v_total_processed + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Total faces processed: %', v_total_processed;
END $$;
*/

-- =====================================================
-- 6. VÉRIFICATION APRÈS EXÉCUTION
-- =====================================================

-- Vérifier qu'il n'y a plus de faces orphelines
SELECT 
  event_id,
  COUNT(*) as remaining_orphans
FROM faces
WHERE face_person_id IS NULL
GROUP BY event_id;

-- Vérifier les clusters créés avec is_singleton = true
SELECT 
  fp.event_id,
  COUNT(*) as singleton_clusters,
  AVG((fp.metadata->>'avg_quality')::float) as avg_quality
FROM face_persons fp
WHERE fp.metadata->>'is_singleton' = 'true'
GROUP BY fp.event_id;

