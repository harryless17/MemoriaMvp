# Fix du problème display_name

## 🐛 Problème identifié

Le `display_name` était sauvegardé correctement dans la base de données, mais était **immédiatement écrasé** par les composants `NavBar.tsx` et `_layout.tsx` (mobile) qui faisaient un `upsert` automatique avec l'email à chaque changement d'état d'authentification.

## ✅ Solution appliquée

### 1. Correction des composants qui écrasaient le profil

#### `apps/web/src/components/NavBar.tsx`
- **Avant** : `upsert` systématique qui écrasait le `display_name` avec l'email
- **Après** : Vérifie d'abord si le profil existe, n'insère que s'il n'existe pas
- **Ligne modifiée** : 33-55

#### `apps/mobile/app/_layout.tsx`
- **Avant** : `upsert` systématique qui écrasait le `display_name` avec l'email
- **Après** : Vérifie d'abord si le profil existe, n'insère que s'il n'existe pas
- **Ligne modifiée** : 8-33

### 2. Nettoyage des logs de debug

#### `apps/web/app/profile/edit/page.tsx`
- Suppression de tous les `console.log` verbeux
- Conservation uniquement des logs d'erreur
- Suppression de la fonction `reloadProfile()` non utilisée
- Code plus propre et maintenable

### 3. Création d'une fonction helper unifiée

#### Nouveau fichier : `apps/web/src/lib/userHelpers.ts`
```typescript
export function getUserDisplayName(user: {
  display_name?: string | null;
  email?: string | null;
}): string {
  if (user.display_name) return user.display_name;
  if (user.email) return user.email;
  return 'Utilisateur';
}
```

Cette fonction assure une **logique cohérente** partout dans l'application :
1. Priorité au `display_name` s'il existe
2. Sinon, utilise l'`email`
3. En dernier recours, affiche "Utilisateur"

### 4. Mise à jour de tous les composants pour utiliser la priorité display_name > email

#### Composants mis à jour :
- ✅ `NavBar.tsx` : Utilise `getUserDisplayName()` pour l'avatar et le menu
- ✅ `events/new/page.tsx` : Utilise `getUserDisplayName()` lors de la création d'événement
- ✅ `AssignModal.tsx` : Affiche `display_name || name || email` au lieu de `display_name || name`
- ✅ `EventCard.tsx` : Affiche `display_name || email` pour l'organisateur
- ✅ `ui/avatar.tsx` : Fallback "Utilisateur" au lieu de "User"

### 5. Nettoyage des fichiers temporaires

Fichiers supprimés :
- ❌ `debug_profile_save.sql`
- ❌ `fix_profiles_complete.sql`

Fichiers conservés pour référence future :
- ✅ `infra/supabase/create_profile_trigger.sql` (trigger automatique)
- ✅ `infra/supabase/profiles_update.sql` (ajout des colonnes bio, location, etc.)

## 🧪 Tests à effectuer

1. ✅ Modifier le `display_name` dans `/profile/edit`
2. ✅ Actualiser la page → Le nom reste sauvegardé
3. ✅ Se déconnecter et se reconnecter → Le nom reste sauvegardé
4. ✅ Vérifier que le nom s'affiche partout : navbar, événements, participants

## 📝 Notes techniques

### Pourquoi le bug se produisait ?

1. L'utilisateur sauvegardait "Zidane" → ✅ Succès
2. La page redirigeait vers `/u/{id}`
3. Le composant `NavBar` détectait un changement d'auth state
4. Il faisait un `upsert` qui **écrasait** `display_name` avec l'email ❌
5. Au rechargement, l'email était affiché au lieu de "Zidane"

### Solution retenue

Au lieu d'utiliser `upsert` (qui insère OU met à jour), on utilise maintenant :
1. Un `SELECT` pour vérifier si le profil existe
2. Un `INSERT` UNIQUEMENT si le profil n'existe pas
3. Pas de modification si le profil existe déjà ✅

Cela permet de :
- ✅ Créer automatiquement les profils manquants
- ✅ Ne JAMAIS écraser les données existantes
- ✅ Respecter les modifications de l'utilisateur

## 🔮 Améliorations futures

1. Ajouter un trigger SQL pour créer automatiquement les profils lors de l'inscription
   - Fichier : `infra/supabase/create_profile_trigger.sql`
   - À déployer sur Supabase pour automatiser complètement

2. Implémenter `getUserInitials()` pour améliorer les avatars sans photo

3. Standardiser tous les affichages de noms d'utilisateurs avec `getUserDisplayName()`

## ✅ Résultat

Le `display_name` est maintenant **persistant** et s'affiche **partout** dans l'application avec la logique :
**display_name > email > "Utilisateur"**

