-- 🔍 Script de Vérification - Quelles Tables Existent ?
-- Exécute ce script pour vérifier que toutes les tables nécessaires sont présentes

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'profiles', 'events', 'event_attendees', 'media', 'likes', 'comments'
    ) THEN '✅ Table de base'
    WHEN table_name IN (
      'albums', 'album_media', 'album_collaborators', 'album_views', 'album_comments'
    ) THEN '✅ Table albums'
    WHEN table_name IN (
      'stories', 'story_views'
    ) THEN '✅ Table stories'
    WHEN table_name IN (
      'media_views'
    ) THEN '✅ Table tracking vues'
    ELSE '❓ Autre'
  END as type,
  CASE 
    WHEN table_name = 'media_with_counts' THEN '📊 Vue SQL'
    ELSE '📦 Table'
  END as kind
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type IN ('BASE TABLE', 'VIEW')
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%'
ORDER BY 
  CASE 
    WHEN table_name IN ('profiles', 'events', 'event_attendees', 'media', 'likes', 'comments') THEN 1
    WHEN table_name IN ('albums', 'album_media', 'album_collaborators', 'album_views', 'album_comments') THEN 2
    WHEN table_name IN ('stories', 'story_views') THEN 3
    WHEN table_name IN ('media_views') THEN 4
    ELSE 5
  END,
  table_name;

-- Vérification des tables manquantes importantes
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_with_counts') 
      THEN '⚠️  Vue media_with_counts manquante - Exécute media_with_counts.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'albums') 
      THEN '⚠️  Tables albums manquantes - Exécute albums.sql et albums_features.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stories') 
      THEN '⚠️  Tables stories manquantes - Exécute stories.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_views') 
      THEN '⚠️  Table media_views manquante - Exécute media_views.sql'
    ELSE '✅ Toutes les tables importantes sont présentes'
  END as status;

