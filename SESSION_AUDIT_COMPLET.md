# Session d'audit complet - MemoriaMvp

**Date**: 21 octobre 2025  
**Objectif**: Analyse page par page, correction des erreurs de schéma BD, standardisation

---

## 📋 Pages analysées et corrigées

### ✅ 1. Pages Marketing
- **`/landing`** 
  - ✅ Navbar standardisée avec `MarketingNavbar`
  - ✅ Bouton "Demander une démo" ajouté
  - ✅ Liens mis à jour

- **`/signup`** 
  - ✅ Page d'inscription créée et fonctionnelle
  - ✅ Intégration Supabase Auth

- **`/demo`** 
  - ✅ Page de demande de démo créée
  - ✅ Formulaire de contact fonctionnel

- **`/login`** 
  - ✅ Page améliorée avec `MarketingNavbar`
  - ✅ Toggle mot de passe visible
  - ✅ Textes traduits en français

### ✅ 2. Dashboard (`/dashboard`)
**Corrections majeures**:
- ❌ **Avant**: `media_tags.user_id` (colonne inexistante)
- ✅ **Après**: Calcul via `event_members.id` → `media_tags.member_id`

- ❌ **Avant**: `event_members.media_count`, `tagged_count` (colonnes inexistantes)
- ✅ **Après**: Calculs dynamiques avec COUNT

- ❌ **Avant**: `events.thumbnail`, `thumbnail_type`, `thumb_path` (colonnes inexistantes)
- ✅ **Après**: Récupération du premier média via table `media`

**Hooks créés**:
- `useDashboardStats` - Statistiques du dashboard
- `useRecentEvents` - Événements récents avec photos
- `useNotifications` - Notifications complètes
- `useUnreadNotifications` - Compteur de notifications non lues

**Améliorations**:
- Système de notifications optimisé (5 visibles, toggle pour voir 20)
- Tri intelligent (non lues en premier)
- Thumbnails d'événements avec première photo

### ✅ 3. Liste des événements (`/events`)
**Corrections**:
- ✅ Suppression imports `@memoria/ui` non disponibles
- ✅ Ajout types et fonctions locales
- ✅ Hook `useEventsWithStats` déjà correct

### ✅ 4. Profil utilisateur
- **`/profile/edit`**
  - ✅ Colonnes BD ajoutées: `bio`, `location`, `website`, `phone`, `date_of_birth`, `updated_at`
  - ✅ Formulaire restauré avec tous les champs
  - ✅ Trigger auto-update `updated_at`

- **`/u/[id]`** 
  - ✅ **Page créée de zéro**
  - ✅ Affichage complet du profil
  - ✅ Détection profil personnel avec bouton "Modifier"

### ✅ 5. Création d'événement (`/events/new`)
**Corrections**:
- ❌ **Avant**: `profiles.email` (colonne inexistante)
- ✅ **Après**: `user.email` depuis auth.users
- ✅ Suppression requête `getUser()` dupliquée

### ✅ 6. Détail d'événement (`/e/[id]`)
**Corrections**:
- ✅ Suppression imports `@memoria/ui`
- ✅ Ajout types et fonctions locales (`Event`, `Media`, `EventMember`, `formatDate`)
- ✅ Toutes les requêtes validées avec le schéma

---

## 🗂️ Fichiers créés

### Documentation
- `DATABASE_SCHEMA.md` - Référence complète du schéma BD
- `get_schema.sql` - Requête pour obtenir le schéma
- `infra/supabase/profiles_update.sql` - Migration profils

### Hooks
- `apps/web/src/hooks/useDashboard.ts`
  - `useDashboardStats()`
  - `useRecentEvents()`
- `apps/web/src/hooks/useNotifications.ts`
  - `useNotifications()`
  - `useUnreadNotifications()`

### Composants UI
- `apps/web/src/components/ui/tooltip.tsx`
- `apps/web/src/components/ui/progress.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/textarea.tsx`

### Layout & Navigation
- `apps/web/src/components/ConditionalLayout.tsx`
- `apps/web/src/components/MarketingNavbar.tsx`

### Utils
- `apps/web/src/lib/utils.ts` - `getThumbUrl()`, `getMediaUrl()`, `cn()`

### Pages
- `apps/web/app/u/[id]/page.tsx` - Page profil utilisateur
- `apps/web/app/demo/page.tsx` - Page demande de démo
- `apps/web/app/signup/page.tsx` - Page inscription

---

## 🔧 Corrections systématiques appliquées

### 1. Erreurs de colonnes
Toutes les requêtes ont été vérifiées contre le schéma réel :

| Table | Colonne utilisée (❌) | Solution (✅) |
|-------|---------------------|--------------|
| `media_tags` | `user_id` | Jointure via `event_members.id` → `member_id` |
| `event_members` | `media_count`, `tagged_count` | Calculs dynamiques avec COUNT |
| `events` | `thumbnail`, `thumbnail_type`, `thumb_path` | Récupération depuis table `media` |
| `profiles` | `email` | Utilisation de `auth.users.email` |

### 2. Imports nettoyés
- Suppression de tous les imports `@memoria/ui` non disponibles
- Remplacement par types et fonctions locales
- Nettoyage des imports inutilisés

### 3. Standardisation
- Routes consolidées sous `/e/[id]` (au lieu de `/events/[id]`)
- Navbars unifiées (marketing vs app)
- Layout conditionnel avec `ConditionalLayout`
- Composants UI centralisés et réutilisables

---

## 📊 Schéma BD - Colonnes principales

### Table: `events`
```
id, owner_id, title, description, date, location, visibility, created_at,
face_recognition_enabled, face_recognition_consent_version,
face_recognition_enabled_at, archived, archived_at
```

### Table: `event_members`
```
id, event_id, user_id, name, email, role, invitation_token,
invitation_sent_at, joined_at, created_at
```

### Table: `media`
```
id, event_id, user_id, type, storage_path, thumb_path, created_at
```

### Table: `media_tags`
```
id, media_id, member_id, tagged_by, tagged_at, source, bbox, face_id
```

### Table: `profiles`
```
id, display_name, avatar_url, bio, location, website, phone,
date_of_birth, created_at, updated_at
```

### Table: `notifications`
```
id, user_id, type, event_id, media_id, title, message, is_read,
created_at, actor_id, updated_at
```

---

## ✅ Résultat final

- **0 erreurs de colonnes** dans toutes les pages analysées
- **Tous les imports** fonctionnels
- **Hooks optimisés** avec calculs corrects
- **Documentation complète** du schéma BD
- **Pages manquantes créées** (`/u/[id]`, `/demo`, `/signup`)
- **Design cohérent** sur toutes les pages

---

## 📝 Pages restantes à analyser (optionnel)

- `/e/[id]/edit` - Édition d'événement
- `/e/[id]/people` - Reconnaissance faciale (déjà fonctionnelle)
- `/invite/[token]` - Acceptation d'invitation

Ces pages peuvent être analysées ultérieurement si nécessaire.

