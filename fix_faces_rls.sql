-- Fix RLS pour permettre aux organisateurs de modifier les faces

-- Vérifier les policies actuelles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'faces';

-- Ajouter une policy pour que les event organizers puissent UPDATE les faces
CREATE POLICY IF NOT EXISTS "Event organizers can update faces"
  ON faces FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE owner_id = auth.uid()
    )
  );
