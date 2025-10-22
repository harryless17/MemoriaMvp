# 🗄️ Supabase Database Setup

## Installation Order

Pour configurer la base de données Supabase, exécutez les scripts SQL dans cet ordre :

### 1. **Schema Principal** (DÉJÀ FAIT)
```sql
-- Exécuté dans l'ordre
schema.sql
policies.sql
```

### 2. **Nouvelles Features**

Exécutez ces nouveaux scripts dans le SQL Editor de Supabase :

#### Albums Personnalisés
```sql
-- Copier/coller le contenu de albums.sql
```

#### Stories/Moments Éphémères
```sql
-- Copier/coller le contenu de stories.sql
```

## ⚙️ Configuration Additionnelle

### Nettoyage Automatique des Stories (Optionnel)

Si vous voulez que les stories expirent automatiquement après 24h, installez l'extension `pg_cron` :

1. Dans Supabase Dashboard → Database → Extensions
2. Activez `pg_cron`
3. Exécutez :
```sql
SELECT cron.schedule(
  'delete-expired-stories', 
  '0 * * * *', 
  'SELECT delete_expired_stories();'
);
```

### Realtime

Assurez-vous que Realtime est activé pour ces tables :
- `stories` (pour les nouvelles stories en temps réel)
- `albums` (pour la synchronisation des albums)
- `album_media` (pour les mises à jour d'albums)

Dans Supabase Dashboard → Database → Replication → activez pour ces tables.

## 📊 Vérification

Pour vérifier que tout est bien configuré :

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Devrait inclure:
-- - events
-- - event_attendees
-- - media
-- - likes
-- - comments
-- - albums
-- - album_media
-- - stories
-- - story_views
-- - profiles
```

## 🔐 RLS Policies

Toutes les tables ont des Row Level Security (RLS) policies activées pour sécuriser les données.

## 🚀 Ready!

Une fois tous les scripts exécutés, votre base de données est prête pour toutes les fonctionnalités de Memoria !
