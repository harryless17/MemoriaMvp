-- Script temporaire pour débugger les erreurs 500
-- À exécuter dans le SQL Editor de Supabase

-- Désactiver temporairement RLS sur media et media_tags
ALTER TABLE public.media DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags DISABLE ROW LEVEL SECURITY;

-- Tester maintenant vos requêtes pour voir si ça fonctionne

-- Une fois que ça marche, ré-activer avec des policies simplifiées :
-- ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
