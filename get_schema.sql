-- Requête pour obtenir la structure complète de toutes les tables
-- Exécutez cette requête dans Supabase SQL Editor pour voir toutes les colonnes

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name IN (
        'events',
        'event_members',
        'media',
        'media_tags',
        'faces',
        'face_persons',
        'profiles',
        'notifications',
        'ml_jobs',
        'likes',
        'comments',
        'albums',
        'album_media',
        'media_views'
    )
ORDER BY 
    table_name, 
    ordinal_position;

-- Alternative: Pour voir les relations (foreign keys)
-- SELECT
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM 
--     information_schema.table_constraints AS tc 
--     JOIN information_schema.key_column_usage AS kcu
--       ON tc.constraint_name = kcu.constraint_name
--       AND tc.table_schema = kcu.table_schema
--     JOIN information_schema.constraint_column_usage AS ccu
--       ON ccu.constraint_name = tc.constraint_name
--       AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND tc.table_schema = 'public'
-- ORDER BY tc.table_name;

