# Migration Memoria V2 - Guide d'exécution

## 📋 Vue d'ensemble

Cette migration transforme Memoria d'une plateforme de type réseau social vers sa fonction originale : **un système de distribution de médias basé sur l'identification de personnes**.

## 🎯 Changements principaux

### ✅ Ajouté
- Table `event_members` : gestion des participants avec rôles (owner, co-organizer, participant)
- Table `media_tags` : identification de personnes dans les médias
- Système d'invitation par token
- Vues pour statistiques (member_media_counts, untagged_media, event_stats)
- Fonctions utiles (add_event_member, tag_media_bulk, etc.)
- RLS policies adaptées au nouveau modèle

### ❌ Supprimé
- Table `likes`
- Table `comments`
- Table `stories` et `story_views`
- Table `albums` et `albums_media`
- Vue `media_with_counts`
- Colonne `visibility` dans `media`

### 🔄 Modifié
- `event_attendees` → `event_members` (avec rôles et invitations)
- Policies RLS pour restreindre l'accès aux médias taggués uniquement

## 🚀 Instructions d'exécution

### Prérequis
- Accès à votre dashboard Supabase
- Backup de votre base de données (recommandé)
- Accès SQL Editor dans Supabase

### Étape 1 : Backup (IMPORTANT !)

```bash
# Via Supabase CLI
supabase db dump > backup_before_v2_$(date +%Y%m%d).sql

# Ou via l'interface Supabase Dashboard > Database > Backups
```

### Étape 2 : Exécuter la migration

1. Ouvrez le **SQL Editor** dans votre dashboard Supabase
2. Copiez le contenu de `migration_v2.sql`
3. Collez et **exécutez le script complet**
4. Vérifiez qu'il n'y a pas d'erreurs
5. Vérifiez les messages de confirmation à la fin

### Étape 3 : Vérification

Exécutez ces requêtes pour vérifier que tout est OK :

```sql
-- Vérifier les nouvelles tables
SELECT COUNT(*) FROM event_members;
SELECT COUNT(*) FROM media_tags;

-- Vérifier les vues
SELECT * FROM event_stats LIMIT 5;
SELECT * FROM untagged_media LIMIT 5;

-- Vérifier les fonctions
SELECT proname FROM pg_proc WHERE proname LIKE '%event%' OR proname LIKE '%tag%';

-- Vérifier RLS
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('event_members', 'media_tags', 'media');
```

### Étape 4 : Tester les permissions

```sql
-- Test: un participant ne doit voir que ses médias taggués
-- Connectez-vous avec un compte test et vérifiez

-- Test: un owner peut taguer
-- Test: un participant ne peut pas taguer
```

## 📊 Données migrées automatiquement

Le script migre automatiquement :
- ✅ `event_attendees` → `event_members`
  - Les owners actuels deviennent role='owner'
  - Les autres deviennent role='participant'
  - Les profils sont récupérés depuis la table profiles

## ⚠️ Points d'attention

### Données non migrées
Les données suivantes seront **perdues** (tables supprimées) :
- ❌ Tous les likes
- ❌ Tous les commentaires
- ❌ Toutes les stories
- ❌ Tous les albums

### Médias existants
- ✅ Tous les médias sont conservés
- ⚠️ Mais ils ne seront **plus visibles** par les participants tant qu'ils ne sont pas taggués
- 👉 Les organisateurs devront **taguer les médias existants** après la migration

## 🔧 En cas de problème

### Rollback
Si quelque chose ne va pas, vous pouvez restore votre backup :

```bash
# Via Supabase CLI
psql $DATABASE_URL < backup_before_v2_YYYYMMDD.sql
```

### Erreurs communes

**Erreur : "function auth.uid() does not exist"**
- Solution : Vérifiez que vous êtes sur Supabase et non PostgreSQL vanilla

**Erreur : "relation already exists"**
- Solution : Certaines tables existent déjà, c'est normal si vous réexécutez le script

**Erreur de permission RLS**
- Solution : Vérifiez que RLS est bien activé : `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`

## 📱 Après la migration : Frontend

Après avoir exécuté la migration, vous devez :

1. **Redéployer le frontend web** avec les nouveaux types
2. **Tester** :
   - Créer un événement
   - Ajouter des membres
   - Uploader des médias
   - Taguer des médias
   - Se connecter en tant qu'invité et vérifier qu'on voit bien seulement ses médias

## 📚 Documentation des nouvelles fonctionnalités

### Ajouter un membre à un événement

```sql
SELECT add_event_member(
  'event-uuid-here',
  'Marie Dupont',
  'marie@example.com',
  'participant'
);
```

### Taguer plusieurs médias en masse

```sql
SELECT tag_media_bulk(
  ARRAY['media-uuid-1', 'media-uuid-2']::UUID[],
  ARRAY['member-uuid-1', 'member-uuid-2']::UUID[],
  'current-user-uuid'::UUID
);
```

### Récupérer le rôle d'un utilisateur

```sql
SELECT get_user_event_role('event-uuid', 'user-uuid');
```

### Vérifier si un utilisateur peut taguer

```sql
SELECT can_tag_in_event('event-uuid', 'user-uuid');
```

## ✅ Checklist post-migration

- [ ] Migration SQL exécutée sans erreur
- [ ] Tables créées (event_members, media_tags)
- [ ] Vues créées (event_stats, etc.)
- [ ] Fonctions créées
- [ ] RLS policies actives
- [ ] Données migrées (event_attendees → event_members)
- [ ] Frontend redéployé
- [ ] Tests effectués (création événement, upload, tagging, vue invité)

## 🆘 Support

En cas de problème, consultez :
- Les logs Supabase dans le dashboard
- La documentation Supabase RLS : https://supabase.com/docs/guides/auth/row-level-security
- Le fichier `migration_v2.sql` pour les détails d'implémentation

---

**Important :** Cette migration est **irréversible** sans restore du backup. Assurez-vous d'avoir testé sur un environnement de développement avant de l'appliquer en production !
