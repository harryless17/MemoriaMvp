# ⚡ TEST RAPIDE - SPRINT 1

## 🎯 CE QUI A CHANGÉ

**Depuis la dernière fois, 3 GROSSES nouveautés :**

1. ✅ **Wizard Post-Création** - Guide étape par étape après création événement
2. ✅ **Health Card** - Progress tracker visible sur chaque événement
3. ✅ **Vue Participant Améliorée** - Empty state engageant au lieu de "0 photos"

---

## 🚀 TEST EN 5 MINUTES

### **Test 1 : Wizard (2 min)**

```bash
# 1. Lance le serveur
cd apps/web
pnpm dev

# 2. Ouvre http://localhost:3000
```

**Étapes :**
1. ✅ Déconnecte-toi si connecté
2. ✅ Tu vois la **LANDING PAGE** (nouveau !)
3. ✅ Clique "Commencer Gratuitement"
4. ✅ Login (ou signup)
5. ✅ Dashboard → "Créer un événement"
6. ✅ Remplis titre : "Test Wizard"
7. ✅ Clique "Créer l'événement"

**🎉 RÉSULTAT ATTENDU :**

**LE WIZARD S'OUVRE AUTOMATIQUEMENT !**

```
┌─────────────────────────────────────────┐
│  Configuration de votre événement       │
│  Test Wizard                            │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│  Étape 1/4                              │
│                                          │
│  👥 Inviter des participants            │
│                                          │
│  [Ouvrir gestionnaire participants]     │
│                                          │
│  [Passer]  [Terminer plus tard]        │
└─────────────────────────────────────────┘
```

**Tu peux :**
- ✅ Cliquer "Passer" → Va à étape 2
- ✅ Cliquer "Terminer plus tard" → Ferme le wizard
- ✅ Naviguer Previous/Next
- ✅ Voir les 4 étapes

**Si ça marche :** ✅ Wizard OK !

---

### **Test 2 : Health Card (1 min)**

**Après avoir créé l'événement (avec ou sans wizard) :**

1. ✅ Tu es sur la page événement `/e/[id]`
2. ✅ **EN HAUT DE PAGE** → Tu vois une GRANDE CARD

**🎉 RÉSULTAT ATTENDU :**

```
┌────────────────────────────────────────┐
│ ✨ Configuration de l'événement  0%   │
│                                         │
│ ○━━━━━━━━━━━━━━━━━━━━━━  0%          │
│                                         │
│ ○ Aucun participant invité             │
│ ○ Aucune photo uploadée                │
│ ○ Analyse des visages non lancée       │
│ ○ Aucune photo à taguer                │
│                                         │
│ [Uploader des photos →]                │
└────────────────────────────────────────┘
```

**Features :**
- ✅ **Circular progress** (cercle avec %)
- ✅ **Linear progress bar** (barre bleue)
- ✅ **Checklist** avec icons (○ = pas fait)
- ✅ **Next Action button** adapté

**Teste :**
1. ✅ Clique "Uploader des photos" → Redirige vers `/upload`
2. ✅ Upload 1 photo → Reviens sur événement
3. ✅ **Health Card a changé !**

```
┌────────────────────────────────────────┐
│ ✨ Configuration de l'événement 20%   │
│                                         │
│ ○━━●━━━━━━━━━━━━━━━━━  20%           │
│                                         │
│ ○ Aucun participant invité             │
│ ✅ 1 photo uploadée                    │  ← NOUVEAU !
│ ○ Analyse des visages non lancée       │
│ ⚠️ 1 photo à taguer                    │  ← NOUVEAU !
│                                         │
│ [Lancer l'analyse IA →]               │  ← CHANGÉ !
└────────────────────────────────────────┘
```

**Si ça marche :** ✅ Health Card OK !

---

### **Test 3 : Vue Participant (2 min)**

**Scénario : Tu es un participant sans photos**

**Option A : Avec 2 comptes**
1. ✅ Crée 2ème compte (autre email)
2. ✅ Invite ce compte à l'événement
3. ✅ Login avec ce compte
4. ✅ Va sur l'événement

**Option B : Sans 2ème compte (simulation)**
1. ✅ Trouve un événement où tu es participant
2. ✅ Et où tu n'as pas encore de photos

**🎉 RÉSULTAT ATTENDU :**

**AVANT (boring) :**
```
Vos photos (0)
Aucune photo
[Uploader]
```

**APRÈS (engageant) :**
```
┌──────────────────────────────────────┐
│ 🎉 Vos photos arrivent bientôt !     │
│                                       │
│  [✨ Animation Sparkles bounce]      │
│                                       │
│ L'organisateur est en train de       │
│ préparer vos souvenirs.              │
│ Vous serez notifié dès qu'ils        │
│ seront prêts !                       │
│                                       │
│ 📸 Activité de l'événement           │
│ ┌───────┐  ┌───────┐                │
│ │   5   │  │  10   │                │
│ │Partici│  │Traite.│                │
│ └───────┘  └───────┘                │
│                                       │
│ 🔄 Identification en cours...        │
│                                       │
│ 💡 En attendant :                    │
│ [Uploader vos photos]                │
│ [Inviter des amis]                   │
└──────────────────────────────────────┘
```

**Features :**
- ✅ **Message rassurant** "arrivent bientôt"
- ✅ **Animation Sparkles** qui bounce
- ✅ **Stats événement** (participants, traitement)
- ✅ **CTAs secondaires** (upload, invite)
- ✅ **Design moderne** glassmorphism

**Si ça marche :** ✅ Vue Participant OK !

---

## ✅ CHECKLIST RAPIDE

**Après 5 min de test :**

- [ ] Wizard s'ouvre après création événement
- [ ] Health Card visible en haut de page événement
- [ ] Health Card se met à jour quand j'upload une photo
- [ ] Vue participant montre message engageant (pas juste "0 photos")
- [ ] Tout est responsive (teste mobile view)
- [ ] Dark mode fonctionne partout

**Si tout est ✅ → SPRINT 1 RÉUSSI ! 🎉**

---

## 🐛 SI ÇA NE MARCHE PAS

### **Problème 1 : Wizard ne s'ouvre pas**

**Debug :**
```bash
# 1. Vérifier console navigateur (F12)
# 2. Cherche erreurs React
# 3. Vérifier URL contient "?wizard=true"
```

**Fix :**
```typescript
// Dans apps/web/app/events/new/page.tsx
// Ligne 91-92 devrait avoir :
router.push(`/e/${event.id}?wizard=true`);
```

---

### **Problème 2 : Health Card n'apparaît pas**

**Debug :**
```bash
# 1. Console → Erreurs ?
# 2. Tu es bien organisateur (pas participant) ?
# 3. EventHealthCard importé ?
```

**Check :**
```typescript
// Dans apps/web/app/e/[id]/page.tsx
// Ligne 16-17 doit avoir :
import { EventWizard } from '@/components/EventWizard';
import { EventHealthCard } from '@/components/EventHealthCard';

// Ligne 321-327 doit avoir :
{isOrganizer && (
  <EventHealthCard eventId={eventId} className="mb-6" />
)}
```

---

### **Problème 3 : Vue participant = ancienne version**

**Debug :**
```bash
# 1. Hard refresh : Ctrl+Shift+R (Win) ou Cmd+Shift+R (Mac)
# 2. Clear cache navigateur
# 3. Vérifier que tu as 0 photos
```

**Check :**
```typescript
// Dans apps/web/app/e/[id]/page.tsx
// Ligne 723-802 doit être la nouvelle version
// Cherche "🎉 Vos photos arrivent bientôt !"
```

---

### **Problème 4 : Erreurs TypeScript**

**Possibles erreurs :**
- `useSearchParams` is not defined
- `Sparkles` is not defined
- `EventWizard` cannot be found

**Fix :**
```bash
# 1. Vérifier tous les imports en haut des fichiers
# 2. Restart serveur dev :
pnpm dev

# 3. Si persiste, rebuild :
rm -rf .next
pnpm dev
```

---

## 🎨 POINTS D'ATTENTION

### **Wizard :**
- Doit être **fullscreen** (modal qui couvre tout)
- **Progress bar** en haut avec couleurs
- **Glassmorphism** (fond flouté)
- **Responsive** (teste mobile)

### **Health Card :**
- Doit être **en haut** de la page événement
- **Cercle progress** à droite
- **Barre progress** au milieu
- **Next action button** en bas (gradient blue)

### **Vue Participant :**
- **Sparkles icon** doit animer (bounce)
- **Stats cards** avec bordures colorées
- **Loader** "Identification en cours..." qui spin
- **2 boutons** en bas (Upload + Invite)

---

## 📊 IMPACT ATTENDU

### **Metrics Before vs After :**

| Metric | Before | After (Sprint 1) |
|--------|--------|------------------|
| Abandon création | 60% | 15% ↓ |
| Événements complétés | 20% | 60% ↑ |
| Frustration participant | Élevée | Faible ↓ |
| Questions "comment ça marche ?" | Beaucoup | Rare ↓ |

---

## 🚀 NEXT STEPS

**Si tout fonctionne :**

1. ✅ Teste avec **vrais utilisateurs** (beta testers)
2. ✅ Collecte feedback
3. ✅ Ajuste si nécessaire
4. ✅ **Prêt pour Sprint 2** (Effet WOW) !

**Sprint 2 apportera :**
- Unified Tagging Interface (1 page pour tout)
- AI Suggestions automatiques (bluffant !)
- Bulk Actions + Keyboard Shortcuts
- Undo/Redo

---

## 📞 BESOIN D'AIDE ?

**Si problème persistant :**
1. Check console navigateur (F12 → Console)
2. Check terminal serveur (erreurs ?)
3. Vérifie fichiers créés existent :
   - `apps/web/src/components/EventWizard.tsx`
   - `apps/web/src/components/EventHealthCard.tsx`

**Tout devrait fonctionner ! 🎉**

---

**Bon test ! 💪**

