-- FIX : Corriger la génération du token d'invitation
-- Problème : Le '=' à la fin du token base64 causait des erreurs dans les URLs
-- Solution : Supprimer tous les caractères spéciaux (=, /, +)

CREATE OR REPLACE FUNCTION public.add_event_member(
  p_event_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT DEFAULT 'participant'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- Générer un token unique URL-safe (sans caractères spéciaux)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');  -- ✅ CORRECTION : Supprimer le =
  
  -- Insérer le membre
  INSERT INTO public.event_members (
    event_id, 
    user_id, 
    name, 
    email, 
    role, 
    invitation_token,
    joined_at
  )
  VALUES (
    p_event_id, 
    v_user_id, 
    p_name, 
    p_email, 
    p_role, 
    v_token,
    CASE WHEN v_user_id IS NOT NULL THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$;

-- Nettoyer les tokens existants
UPDATE event_members
SET invitation_token = REPLACE(REPLACE(REPLACE(invitation_token, '/', '_'), '+', '-'), '=', '')
WHERE invitation_token IS NOT NULL
  AND (
    invitation_token LIKE '%=%' OR 
    invitation_token LIKE '%/%' OR 
    invitation_token LIKE '%+%'
  );

