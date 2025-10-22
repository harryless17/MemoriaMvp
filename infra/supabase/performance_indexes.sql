-- ============================================
-- MEMORIA - Performance Indexes
-- ============================================
-- Ce script crée des index pour optimiser les performances des requêtes
-- Gain attendu : -50 à -100ms sur les requêtes complexes
--
-- À exécuter dans le SQL Editor de Supabase Dashboard
-- ============================================

-- Index pour la table 'events'
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Index pour la table 'event_members'
CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_event_user ON event_members(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_role ON event_members(role);
CREATE INDEX IF NOT EXISTS idx_event_members_joined_at ON event_members(joined_at);

-- Index pour la table 'media'
CREATE INDEX IF NOT EXISTS idx_media_event_id ON media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_uploader_id ON media(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_event_created ON media(event_id, created_at DESC);

-- Index pour la table 'media_tags'
CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_member_id ON media_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_media_member ON media_tags(media_id, member_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tagged_by ON media_tags(tagged_by);
CREATE INDEX IF NOT EXISTS idx_media_tags_created_at ON media_tags(created_at DESC);

-- Index pour la table 'notifications'
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);

-- Index pour la table 'profiles'
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- ============================================
-- Vérification des index créés
-- ============================================

-- Pour voir tous les index créés, tu peux exécuter :
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- ============================================
-- Notes :
-- ============================================
-- 1. Ces index sont "IF NOT EXISTS", donc tu peux exécuter ce script plusieurs fois sans erreur
-- 2. La création des index peut prendre quelques secondes si tu as beaucoup de données
-- 3. Les index composites (ex: event_id, user_id) optimisent les requêtes avec WHERE sur les deux colonnes
-- 4. Les index DESC sur created_at optimisent les ORDER BY ... DESC (requêtes récentes)
