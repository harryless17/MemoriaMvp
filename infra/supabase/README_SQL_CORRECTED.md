# Memoria Database Setup - Fichiers SQL Corrigés

Ce dossier contient les fichiers SQL corrigés et optimisés pour Supabase, prêts à être copiés-collés sans erreurs.

## 📁 Fichiers Disponibles

### 1. `schema_corrected.sql` 
**Fichier principal du schéma de base de données**
- ✅ Toutes les tables nécessaires pour Memoria
- ✅ Extensions requises (uuid-ossp, vector)
- ✅ Indexes optimisés pour les performances
- ✅ Fonctions helper et triggers
- ✅ Vues pour faciliter les requêtes
- ✅ Compatible avec Supabase

### 2. `policies_corrected.sql`
**Politiques de sécurité au niveau des lignes (RLS)**
- ✅ RLS activé sur toutes les tables
- ✅ Politiques simplifiées pour éviter les erreurs 500
- ✅ Fonctions helper pour les vérifications de permissions
- ✅ Triggers pour les notifications automatiques
- ✅ Compatible avec Supabase

### 3. `seed_corrected.sql`
**Données de test et fonctions utilitaires**
- ✅ Fonctions pour créer des données de test
- ✅ Requêtes de vérification du schéma
- ✅ Instructions de développement
- ✅ Fonctions de nettoyage pour les tests

## 🚀 Instructions d'Installation

### Étape 1 : Créer un projet Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Attendez que le projet soit prêt

### Étape 2 : Exécuter le schéma
1. Ouvrez l'éditeur SQL de Supabase
2. Copiez-collez le contenu de `schema_corrected.sql`
3. Exécutez le script
4. Vérifiez qu'il n'y a pas d'erreurs

### Étape 3 : Configurer les politiques
1. Copiez-collez le contenu de `policies_corrected.sql`
2. Exécutez le script
3. Vérifiez que toutes les politiques sont créées

### Étape 4 : Optionnel - Données de test
1. Copiez-collez le contenu de `seed_corrected.sql`
2. Exécutez le script
3. Utilisez les fonctions de test si nécessaire

## 🔧 Configuration Supplémentaire

### Storage Bucket
Créez un bucket de stockage nommé `media` :
```sql
-- Via l'interface Supabase ou l'API
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true);
```

### Variables d'Environnement
Ajoutez ces variables à votre application :
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Tables Créées

### Tables Principales
- `profiles` - Profils utilisateurs
- `events` - Événements
- `event_members` - Membres des événements
- `media` - Photos et vidéos
- `media_tags` - Tags des médias
- `notifications` - Notifications utilisateurs

### Tables ML (Face Clustering)
- `ml_jobs` - Queue des tâches ML
- `face_persons` - Clusters de visages
- `faces` - Visages détectés avec embeddings
- `media_views` - Analytics des vues

## 🔍 Vérification

Après l'installation, vérifiez que tout fonctionne :

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Vérifier les fonctions
SELECT proname FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%memoria%' OR proname IN ('create_notification', 'add_event_member');
```

## 🐛 Résolution de Problèmes

### Erreur "relation does not exist"
- Vérifiez que `schema_corrected.sql` a été exécuté en premier
- Assurez-vous qu'il n'y a pas d'erreurs dans l'exécution

### Erreur "permission denied"
- Vérifiez que les politiques RLS sont correctement configurées
- Assurez-vous que l'utilisateur est authentifié

### Erreur "function does not exist"
- Vérifiez que toutes les fonctions ont été créées
- Ré-exécutez `policies_corrected.sql` si nécessaire

## 📝 Notes Importantes

1. **Ordre d'exécution** : Toujours exécuter les fichiers dans l'ordre (schema → policies → seed)
2. **Extensions** : Les extensions `uuid-ossp` et `vector` sont automatiquement installées
3. **RLS** : Toutes les tables ont RLS activé pour la sécurité
4. **Compatibilité** : Ces fichiers sont optimisés pour Supabase et PostgreSQL 15+

## 🔄 Migration depuis l'Ancien Schéma

Si vous migrez depuis l'ancien schéma :
1. Sauvegardez vos données importantes
2. Exécutez les nouveaux fichiers SQL
3. Migrez vos données si nécessaire
4. Testez l'application

## 📞 Support

En cas de problème :
1. Vérifiez les logs Supabase
2. Consultez la documentation Supabase
3. Vérifiez que toutes les étapes ont été suivies

---

**✅ Ces fichiers sont prêts pour la production et ont été testés pour être compatibles avec Supabase.**
