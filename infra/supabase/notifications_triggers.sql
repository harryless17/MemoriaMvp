-- ================================================
-- NOTIFICATIONS TRIGGERS - Real-time notifications
-- ================================================
-- Description: Automatic notifications when participants are tagged in photos
-- Created: October 2025

-- ================================================
-- 1. Function to notify participant when tagged
-- ================================================
CREATE OR REPLACE FUNCTION notify_participant_tagged()
RETURNS TRIGGER AS $$
DECLARE
  v_member_user_id UUID;
  v_event_title TEXT;
  v_event_id UUID;
  v_photo_count INTEGER;
  v_member_name TEXT;
  v_existing_notif_id UUID;
BEGIN
  -- Get member's user_id and name
  SELECT user_id, name INTO v_member_user_id, v_member_name
  FROM event_members
  WHERE id = NEW.member_id;
  
  -- Skip if member has no linked user account
  IF v_member_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get event info
  SELECT e.id, e.title INTO v_event_id, v_event_title
  FROM events e
  JOIN media m ON m.event_id = e.id
  WHERE m.id = NEW.media_id;
  
  -- Count total photos for this user in this event
  SELECT COUNT(DISTINCT mt.media_id) INTO v_photo_count
  FROM media_tags mt
  JOIN media m ON m.id = mt.media_id
  WHERE mt.member_id = NEW.member_id
    AND m.event_id = v_event_id;
  
  -- Check if there's already a recent notification for this event (last 5 minutes)
  -- To avoid spamming when batch tagging
  SELECT id INTO v_existing_notif_id
  FROM notifications
  WHERE user_id = v_member_user_id
    AND event_id = v_event_id
    AND type = 'new_photos'
    AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_notif_id IS NOT NULL THEN
    -- Update existing notification with new count
    UPDATE notifications
    SET 
      message = format('Vous avez maintenant %s photo%s dans "%s"', 
        v_photo_count,
        CASE WHEN v_photo_count > 1 THEN 's' ELSE '' END,
        v_event_title
      ),
      updated_at = NOW(),
      is_read = false  -- Mark as unread again
    WHERE id = v_existing_notif_id;
  ELSE
    -- Create new notification
    INSERT INTO notifications (user_id, title, message, type, event_id, is_read)
    VALUES (
      v_member_user_id,
      '🎉 Nouvelles photos !',
      format('Vous avez %s photo%s dans "%s"', 
        v_photo_count,
        CASE WHEN v_photo_count > 1 THEN 's' ELSE '' END,
        v_event_title
      ),
      'new_photos',
      v_event_id,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. Trigger on media_tags insert
-- ================================================
DROP TRIGGER IF EXISTS on_media_tag_inserted ON media_tags;

CREATE TRIGGER on_media_tag_inserted
AFTER INSERT ON media_tags
FOR EACH ROW
EXECUTE FUNCTION notify_participant_tagged();

-- ================================================
-- 3. Function to notify when event tagging is complete
-- ================================================
CREATE OR REPLACE FUNCTION notify_event_tagging_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
  v_event_title TEXT;
  v_total_media INTEGER;
  v_tagged_media INTEGER;
  v_member_user_id UUID;
  v_member_photo_count INTEGER;
BEGIN
  -- Get event from media
  SELECT e.id, e.title INTO v_event_id, v_event_title
  FROM events e
  JOIN media m ON m.event_id = e.id
  WHERE m.id = NEW.media_id;
  
  -- Count total media in event
  SELECT COUNT(*) INTO v_total_media
  FROM media
  WHERE event_id = v_event_id;
  
  -- Count tagged media (media with at least one tag)
  SELECT COUNT(DISTINCT media_id) INTO v_tagged_media
  FROM media_tags mt
  JOIN media m ON m.id = mt.media_id
  WHERE m.event_id = v_event_id;
  
  -- Check if tagging is now 100% complete
  IF v_tagged_media = v_total_media THEN
    -- Get member info
    SELECT user_id INTO v_member_user_id
    FROM event_members
    WHERE id = NEW.member_id;
    
    IF v_member_user_id IS NOT NULL THEN
      -- Count photos for this member
      SELECT COUNT(DISTINCT mt.media_id) INTO v_member_photo_count
      FROM media_tags mt
      JOIN media m ON m.id = mt.media_id
      WHERE mt.member_id = NEW.member_id
        AND m.event_id = v_event_id;
      
      -- Create completion notification
      INSERT INTO notifications (user_id, title, message, type, event_id, is_read)
      VALUES (
        v_member_user_id,
        '✅ Vos photos sont prêtes !',
        format('%s photo%s vous attendent dans "%s"', 
          v_member_photo_count,
          CASE WHEN v_member_photo_count > 1 THEN 's' ELSE '' END,
          v_event_title
        ),
        'event_complete',
        v_event_id,
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. Trigger for completion notifications
-- ================================================
DROP TRIGGER IF EXISTS on_media_tag_check_complete ON media_tags;

CREATE TRIGGER on_media_tag_check_complete
AFTER INSERT ON media_tags
FOR EACH ROW
EXECUTE FUNCTION notify_event_tagging_complete();

-- ================================================
-- 5. Function to mark notifications as read
-- ================================================
-- Drop if exists to avoid signature conflicts
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);

CREATE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 6. Function to mark all notifications as read for a user
-- ================================================
CREATE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON FUNCTION notify_participant_tagged() IS 
  'Automatically notifies participants when they are tagged in photos. Groups notifications within 5 minutes to avoid spam.';

COMMENT ON FUNCTION notify_event_tagging_complete() IS 
  'Notifies participants when all photos in an event have been tagged (100% complete).';

COMMENT ON TRIGGER on_media_tag_inserted ON media_tags IS 
  'Triggers notification when a participant is tagged in a photo';

COMMENT ON TRIGGER on_media_tag_check_complete ON media_tags IS 
  'Checks if event tagging is complete and notifies participants';

