-- Vérifier les tokens d'invitation récents
SELECT 
  name,
  email,
  invitation_token,
  user_id,
  joined_at,
  created_at
FROM event_members
WHERE email LIKE '%@%'
  AND invitation_token IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
