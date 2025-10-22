-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tagged_in_media', 'added_to_event', 'invitation_sent', 'new_photos')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter la colonne actor_id si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs ne voient que leurs notifications
DROP POLICY IF EXISTS "users_see_own_notifications" ON notifications;
CREATE POLICY "users_see_own_notifications" ON notifications
  FOR ALL
  USING (auth.uid() = user_id);

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_event_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_media_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, event_id, media_id, actor_id, title, message)
  VALUES (p_user_id, p_type, p_event_id, p_media_id, p_actor_id, p_title, p_message)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET is_read = TRUE 
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET is_read = TRUE 
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour notification quand un utilisateur est tagué dans un média
CREATE OR REPLACE FUNCTION notify_user_tagged()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  media_type TEXT;
  uploader_name TEXT;
  uploader_id UUID;
  target_user_id UUID;
  target_event_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur et de l'événement
  SELECT em.user_id, m.event_id, m.user_id
  INTO target_user_id, target_event_id, uploader_id
  FROM event_members em
  JOIN media m ON m.event_id = em.event_id
  WHERE em.id = NEW.member_id AND m.id = NEW.media_id;
  
  -- Créer la notification seulement si l'utilisateur a un compte et n'est pas celui qui a uploadé
  IF target_user_id IS NOT NULL AND target_user_id != uploader_id THEN
    -- Récupérer les infos de l'événement et du média
    SELECT 
      COALESCE(e.title, 'Événement inconnu'),
      COALESCE(m.type, 'photo'),
      COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1), 'Quelqu''un')
    INTO event_title, media_type, uploader_name
    FROM events e
    JOIN media m ON m.event_id = e.id
    LEFT JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.id = NEW.media_id AND e.id = target_event_id;
    
    -- Créer la notification avec un message sécurisé
    PERFORM create_notification(
      target_user_id,
      'tagged_in_media',
      target_event_id,
      'Vous avez été tagué !',
      'Vous avez été tagué dans ' || 
      CASE WHEN media_type = 'photo' THEN 'une photo' ELSE 'une vidéo' END ||
      ' par ' || COALESCE(uploader_name, 'quelqu''un') || ' dans l''événement "' || COALESCE(event_title, 'inconnu') || '"',
      NEW.media_id,
      uploader_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour notification quand un utilisateur est ajouté à un événement
CREATE OR REPLACE FUNCTION notify_user_added_to_event()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  adder_name TEXT;
  adder_id UUID;
  event_owner_id UUID;
BEGIN
  -- Récupérer l'ID de l'organisateur et les infos de l'événement
  SELECT 
    COALESCE(e.title, 'Événement inconnu'),
    e.owner_id
  INTO event_title, event_owner_id
  FROM events e
  WHERE e.id = NEW.event_id;
  
  -- Récupérer le nom de la personne qui a ajouté (supposons que c'est l'owner ou un co-organizer)
  -- On utilise l'owner par défaut car on n'a pas d'info sur qui a fait l'action exactement
  SELECT 
    COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1), 'Quelqu''un')
  INTO adder_name
  FROM profiles p
  RIGHT JOIN auth.users u ON u.id = p.id
  WHERE u.id = event_owner_id;
  
  -- Créer la notification seulement si l'utilisateur a un compte et n'est pas l'owner
  IF NEW.user_id IS NOT NULL AND NEW.user_id != event_owner_id THEN
    PERFORM create_notification(
      NEW.user_id,
      'added_to_event',
      NEW.event_id,
      'Nouvel événement !',
      'Vous avez été ajouté à l''événement "' || COALESCE(event_title, 'inconnu') || '" par ' || COALESCE(adder_name, 'l''organisateur'),
      NULL,
      event_owner_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers
DROP TRIGGER IF EXISTS trigger_notify_user_tagged ON media_tags;
CREATE TRIGGER trigger_notify_user_tagged
  AFTER INSERT ON media_tags
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_tagged();

DROP TRIGGER IF EXISTS trigger_notify_user_added ON event_members;
CREATE TRIGGER trigger_notify_user_added
  AFTER INSERT ON event_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_added_to_event();

-- Note: Le script est maintenant idempotent et peut être exécuté plusieurs fois
