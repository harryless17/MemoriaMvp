-- ============================================
-- SUPABASE STORAGE: AVATARS BUCKET
-- ============================================
-- Ce script configure le bucket de stockage pour les avatars

-- Créer le bucket avatars s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

-- Policy: Tout le monde peut voir les avatars publics
CREATE POLICY "avatars_select_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Les utilisateurs peuvent uploader leurs propres avatars
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres avatars
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Les utilisateurs peuvent supprimer leurs propres avatars
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

