# 🎯 Unification complète de l'affichage des noms - MemoriaMvp

## ✅ Principe adopté

**Logique d'affichage prioritaire :** `display_name > email > "Utilisateur"`

Cette logique est implémentée via la fonction helper `getUserDisplayName()` dans `/src/lib/userHelpers.ts`

---

## ✅ Fichiers mis à jour (complétés)

### 1. **Composants UI principaux**
- ✅ `MemberCount.tsx` - Liste déroulante des membres
- ✅ `MembersList.tsx` - Liste complète avec avatars et rôles
- ✅ `MemberSelector.tsx` - Sélection multiple de membres
- ✅ `EventCard.tsx` - Carte d'événement avec organisateur
- ✅ `ui/avatar.tsx` - Fallback "Utilisateur" au lieu de "User"

### 2. **Pages**
- ✅ `u/[id]/page.tsx` - Page de profil utilisateur
- ✅ `e/[id]/page.tsx` - Page détails événement (preview membres)
- ✅ `events/new/page.tsx` - Création d'événement
- ✅ `profile/edit/page.tsx` - Édition de profil (nettoyage logs)

### 3. **Composants principaux**
- ✅ `NavBar.tsx` - Navigation avec avatar et nom
- ✅ `AssignModal.tsx` - Modal d'assignation (display_name || name || email)

---

## ⚠️ Fichiers à mettre à jour (restants)

### Priorité HAUTE - Affichage utilisateurs
1. **`AssignModalV2.tsx`** (lignes 560, 565)
   - Remplacer `member.name || 'User'` par `getUserDisplayName({ display_name: member.user?.display_name, email: member.email })`
   - Ligne 55 : filter aussi à mettre à jour

2. **`InviteMembersDialog.tsx`**
   - Vérifier l'affichage des suggestions de membres

3. **`SendInvitationsDialog.tsx`**
   - Vérifier l'affichage des membres à inviter

4. **`NotificationDropdown.tsx`**
   - Affichage des noms dans les notifications

### Priorité MOYENNE - Tagging et reconnaissance faciale
5. **`people/AITaggingView.tsx`**
   - Affichage des membres lors du tagging AI

6. **`people/ManualTaggingView.tsx`**
   - Affichage des membres lors du tagging manuel

7. **`ClusterSuggestion.tsx`**
   - Affichage dans les suggestions de clusters

### Priorité BASSE - Autres
8. **`UploadForm.tsx`**
   - Affichage du nom de l'organisateur

9. **`invite/[token]/page.tsx`**
   - Page d'invitation

---

## 📝 Pattern de remplacement

### Avant :
```typescript
<Avatar 
  src={member.avatar_url}
  name={member.name || 'User'}
/>
<p>{member.name}</p>
```

### Après :
```typescript
import { getUserDisplayName } from '@/lib/userHelpers';

<Avatar 
  src={member.avatar_url}
  name={getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}
/>
<p>{getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}</p>
```

---

## 🧪 Tests à effectuer

1. ✅ Navbar → affiche display_name ou email
2. ✅ Liste de membres → affiche display_name ou email  
3. ✅ Page de profil → affiche display_name ou email
4. ✅ Événement → membres affichés avec display_name ou email
5. ⏳ Modal d'assignation → à tester
6. ⏳ Notifications → à tester
7. ⏳ Tagging (AI & Manuel) → à tester
8. ⏳ Invitations → à tester

---

## 🚀 Prochaines étapes

1. Compléter les 9 fichiers restants avec le même pattern
2. Tester chaque page pour vérifier que les noms s'affichent correctement
3. Vérifier que le `display_name` reste sauvegardé après les modifications
4. Déployer le trigger SQL sur Supabase (`create_profile_trigger.sql`)

---

## 📊 Statistiques

- **Fichiers complétés** : 10/19
- **Progression** : ~53%
- **Helper créé** : `getUserDisplayName()` + `getUserInitials()`
- **Bugs corrigés** : 
  - ✅ display_name écrasé par email
  - ✅ Fallback "User" → "Utilisateur"
  - ✅ Affichage inconsistant entre composants

---

## 🎯 Résultat final attendu

**Partout dans l'application :**
- Si l'utilisateur a un `display_name` → **on l'affiche** ✨
- Sinon, si on a l'`email` → **on l'affiche** 📧
- Sinon → **"Utilisateur"** 👤

**Cohérence totale + UX améliorée !**

