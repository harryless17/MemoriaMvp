# 🔧 WIZARD - CORRECTIONS & AMÉLIORATIONS

**Date :** Octobre 2025  
**Problèmes reportés :** Navigation wizard cassée  
**Status :** ✅ CORRIGÉ

---

## 🐛 PROBLÈMES IDENTIFIÉS

### **Problème 1 : Pas d'auto-advance après invitation**
**Symptôme :** Après avoir invité un participant (étape 1), le wizard ne passait pas automatiquement à l'étape 2.

**Cause :** Le callback `onMemberAdded` ne proposait pas d'avancer.

---

### **Problème 2 : Wizard reset à l'étape 1**
**Symptôme :** Après avoir cliqué "Passer" et uploadé une photo, en revenant, le wizard recommençait à l'étape 1.

**Cause :** Le state du wizard n'était pas sauvegardé ET restauré correctement depuis localStorage.

---

### **Problème 3 : Impossible de finir les étapes**
**Symptôme :** Navigation bloquée, impossible d'avancer.

**Causes multiples :**
- Pas de bouton "Continuer" principal
- Étape 2 (Upload) intégrée directement mais sans callback
- State localStorage pas restauré

---

## ✅ CORRECTIONS APPLIQUÉES

### **Fix 1 : Auto-advance après invitation** ⭐

**Fichier :** `apps/web/src/components/EventWizard.tsx` (Ligne 349-360)

**Avant :**
```typescript
onMemberAdded={() => {
  setInviteDialogOpen(false);
  // Rien d'autre
}}
```

**Après :**
```typescript
onMemberAdded={() => {
  setInviteDialogOpen(false);
  // Show success and suggest moving to next step
  if (currentStep === 1) {
    setTimeout(() => {
      if (window.confirm('✅ Participant(s) ajouté(s) !\n\nVoulez-vous passer à l\'étape suivante (Upload des photos) ?')) {
        handleNext();
      }
    }, 300);
  }
}}
```

**Résultat :**
- ✅ Après avoir ajouté participant(s), popup demande si passer à l'étape suivante
- ✅ User peut choisir (Continuer ou Rester)
- ✅ Feedback clair

---

### **Fix 2 : Persistence du state** ⭐⭐

**Fichier :** `apps/web/src/components/EventWizard.tsx`

#### **A. Sauvegarde à chaque navigation**

**Ligne 76-118 :**
```typescript
const handleNext = () => {
  const nextStep = currentStep + 1;
  
  if (isLastStep) {
    localStorage.removeItem(`wizard_${eventId}`); // Clear when done
    router.push(`/events/${eventId}/analyse`);
    onClose();
  } else {
    setCurrentStep(nextStep);
    // ⭐ SAVE PROGRESS ⭐
    localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
      step: nextStep,
      timestamp: new Date().toISOString()
    }));
  }
};

const handlePrevious = () => {
  if (!isFirstStep) {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    // ⭐ SAVE PROGRESS ⭐
    localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
      step: prevStep,
      timestamp: new Date().toISOString()
    }));
  }
};
```

#### **B. Restauration au chargement**

**Ligne 33-48 :**
```typescript
// Restore wizard state from localStorage on mount
useEffect(() => {
  if (isOpen) {
    const savedState = localStorage.getItem(`wizard_${eventId}`);
    if (savedState) {
      try {
        const { step } = JSON.parse(savedState);
        if (step && step > 1 && step <= 4) {
          setCurrentStep(step); // ⭐ RESTORE STEP ⭐
        }
      } catch (error) {
        console.error('Error parsing wizard state:', error);
      }
    }
  }
}, [isOpen, eventId]);
```

**Résultat :**
- ✅ Wizard se rappelle de l'étape actuelle
- ✅ Si tu fermes et rouvres, tu reprends où tu étais
- ✅ Quand terminé, le state est clear (pas de boucle infinie)

---

### **Fix 3 : Navigation clarifiée** ⭐⭐⭐

**Fichier :** `apps/web/src/components/EventWizard.tsx` (Ligne 300-339)

**Changements footer :**

#### **A. Bouton "Continuer" principal ajouté**

```typescript
<Button
  onClick={handleNext}
  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
>
  {isLastStep ? 'Terminer' : 'Continuer'}
  <ArrowRight className="w-4 h-4" />
</Button>
```

**Placement :** Toujours visible en bas à droite

#### **B. Bouton "Passer" conditionnel**

```typescript
{currentStepData.skippable && !isLastStep && (
  <Button variant="outline" onClick={handleSkip}>
    Passer
  </Button>
)}
```

**Visibilité :** 
- Étape 1 (Invite) : ✅ Passer visible
- Étape 2 (Upload) : ❌ Passer caché (obligatoire)
- Étape 3 (Analyse) : ✅ Passer visible
- Étape 4 (Identify) : ❌ Passer caché (dernière étape)

#### **C. Organisation footer**

```
[← Précédent]     [Passer] [Terminer plus tard] [Continuer →]
     ↑                ↑            ↑                   ↑
   Gauche         Centre      Centre               Droite
```

**Résultat :**
- ✅ Navigation claire
- ✅ Action principale évidente (Continuer)
- ✅ Options secondaires disponibles

---

### **Fix 4 : Étape 2 (Upload) repensée** ⭐⭐

**Problème :** UploadForm trop complexe à intégrer directement

**Solution :** Redirection vers page upload avec retour intelligent

**Ligne 239-277 :**
```typescript
{currentStep === 2 && (
  <div>
    <p>Importez toutes les photos...</p>
    
    {/* Info cards */}
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>📸 Photos - JPG, PNG, HEIC</div>
      <div>📤 Jusqu'à 50MB - Par fichier</div>
    </div>
    
    {/* CTA */}
    <Button onClick={() => {
      // Save step 2 in localStorage
      localStorage.setItem(`wizard_${eventId}`, ...);
      // Redirect to upload with param
      router.push(`/upload?eventId=${eventId}&fromWizard=true`);
    }}>
      Aller à la page d'upload
    </Button>
    
    {/* Helper text */}
    <p>💡 Après avoir uploadé, revenez ici et cliquez Continuer</p>
  </div>
)}
```

**Flow utilisateur :**
```
Wizard étape 2 
  → Clique "Aller à page upload"
  → Upload page (avec eventId pré-sélectionné)
  → Upload photos
  → Retour navigateur ou lien
  → Page événement
  → Clique "Rouvrir le guide"
  → Wizard rouvre à l'étape 2
  → Clique "Continuer"
  → Étape 3 !
```

**Résultat :**
- ✅ Pas de conflit avec UploadForm existant
- ✅ User garde contrôle
- ✅ Instructions claires

---

### **Fix 5 : Bouton "Rouvrir le wizard"** ⭐

**Fichier :** `apps/web/app/e/[id]/page.tsx` (Ligne 330-335)

**Ajouté sous la Health Card :**
```typescript
<button
  onClick={() => setWizardOpen(true)}
  className="w-full text-center py-2 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
>
  🪄 Besoin d'aide ? Rouvrir le guide pas à pas
</button>
```

**Résultat :**
- ✅ User peut toujours rouvrir le wizard
- ✅ Wizard se rappelle de l'étape
- ✅ Pas bloqué si fermé prématurément

---

## 🎯 NOUVEAU WORKFLOW (Corrigé)

### **Scénario 1 : Flow complet sans interruption**

```
1. Crée événement
   ↓
2. Wizard s'ouvre (étape 1)
   ↓
3. Clique "Inviter participants"
   ↓
4. Ajoute 3 participants
   ↓
5. Popup : "Participant(s) ajouté(s) ! Passer à l'étape suivante ?"
   → Clique "OK"
   ↓
6. Wizard passe à étape 2 (Upload)
   ↓
7. Clique "Aller à la page upload"
   ↓
8. Upload 50 photos
   ↓
9. Retour à événement
   ↓
10. Clique "Rouvrir le guide"
   ↓
11. Wizard rouvre à étape 2 (se rappelle !)
   ↓
12. Clique "Continuer" → Étape 3
   ↓
13. Clique "Lancer analyse" → Étape 4
   ↓
14. Clique "Terminer" → Redirigé vers /analyse
   ↓
15. ✅ FINI !
```

---

### **Scénario 2 : Avec interruptions**

```
1. Wizard étape 1 → Clique "Passer"
   ↓ (sauvegarde step 2)
2. Wizard étape 2 → Clique "Terminer plus tard"
   ↓ (sauvegarde step 2)
3. Fermeture wizard
   ↓
4. [Plus tard] Clique "Rouvrir le guide"
   ↓
5. Wizard rouvre à étape 2 ! ✅
   ↓
6. Continue normalement...
```

---

### **Scénario 3 : Skip maximum**

```
1. Wizard étape 1 → "Passer"
   ↓
2. Wizard étape 2 → "Aller à upload" → Upload → Reviens → "Continuer"
   ↓
3. Wizard étape 3 → "Passer"
   ↓
4. Wizard étape 4 → "Terminer"
   ↓
5. Redirigé vers /analyse
   ↓
6. ✅ TERMINÉ (avec étapes 1 et 3 skippées)
```

---

## 🎨 AMÉLIORATIONS UX AJOUTÉES

### **1. Feedback après actions** ✅

**Après ajout participant :**
```
┌────────────────────────────────┐
│ ✅ Participant(s) ajouté(s) !  │
│                                 │
│ Voulez-vous passer à l'étape   │
│ suivante (Upload des photos) ? │
│                                 │
│      [Annuler]  [OK]           │
└────────────────────────────────┘
```

### **2. Instructions claires** ✅

**Étape 2 (Upload) :**
```
💡 Après avoir uploadé vos photos, 
   revenez ici et cliquez sur Continuer
```

**Étape 4 (Final) :**
```
🎉 Configuration terminée !
💡 L'analyse faciale vous permettra de...
```

### **3. Navigation évidente** ✅

**Footer toujours visible :**
```
[← Précédent]  [Passer] [Terminer + tard] [Continuer →]
                  ↑                           ↑
            Si skippable               Action principale
```

### **4. Bouton de récupération** ✅

**Sur page événement :**
```
🪄 Besoin d'aide ? Rouvrir le guide pas à pas
```

Visible juste sous la Health Card.

---

## 🧪 COMMENT TESTER (3 MIN)

### **Test 1 : Flow complet**

```bash
1. Crée un nouvel événement
   → Wizard s'ouvre ✅

2. Étape 1 : Clique "Inviter participants"
   → Dialog s'ouvre ✅
   → Ajoute 1 participant
   → Popup "Passer à l'étape suivante ?" ✅
   → Clique OK
   → Wizard passe à étape 2 ! ✅

3. Étape 2 : Clique "Aller à la page upload"
   → Redirigé vers /upload ✅
   → Upload 1 photo
   → Retour navigateur
   → Clique "Rouvrir le guide" ✅
   → Wizard rouvre à étape 2 ! ✅
   → Clique "Continuer"
   → Étape 3 ! ✅

4. Étape 3 : Clique "Lancer analyse"
   → Étape 4 ! ✅

5. Étape 4 : Clique "Terminer"
   → Redirigé vers /analyse ✅
   → ✅ WIZARD TERMINÉ
```

**Si tout marche :** ✅ Wizard OK !

---

### **Test 2 : Interruption & reprise**

```bash
1. Wizard étape 1 → Clique "Passer"
   → Passe à étape 2 ✅

2. Étape 2 → Clique "Terminer plus tard"
   → Wizard se ferme ✅
   → localStorage sauvegarde step=2 ✅

3. Clique "Rouvrir le guide"
   → Wizard rouvre ✅
   → Sur étape 2 (pas étape 1 !) ✅

4. Continue normalement...
```

---

### **Test 3 : Navigation**

```bash
1. Wizard étape 1
   → Bouton "Précédent" disabled ✅
   → Bouton "Passer" visible ✅
   → Bouton "Continuer" visible ✅

2. Clique "Continuer" → Étape 2
   → Bouton "Précédent" enabled ✅
   → Bouton "Passer" CACHÉ (obligatoire) ✅
   → Bouton "Continuer" visible ✅

3. Clique "Précédent"
   → Retour étape 1 ✅
   → State sauvegardé ✅
```

---

## 📋 CHANGEMENTS DÉTAILLÉS

### **Fichier : EventWizard.tsx**

**Imports :**
```typescript
// Ligne 3 : Ajouté useEffect
import { useState, useEffect } from 'react';

// Ligne 16 : Ajouté Upload icon
import { Upload } from 'lucide-react';
```

**Logic :**
```typescript
// Ligne 33-48 : Restauration state
useEffect(() => {
  if (isOpen) {
    const savedState = localStorage.getItem(`wizard_${eventId}`);
    if (savedState) {
      const { step } = JSON.parse(savedState);
      setCurrentStep(step); // ⭐ RESTORE
    }
  }
}, [isOpen, eventId]);

// Ligne 76-118 : Sauvegarde à chaque navigation
handleNext() → Save nextStep
handlePrevious() → Save prevStep

// Ligne 349-360 : Auto-advance après invite
onMemberAdded() → Confirm popup → handleNext()
```

**UI :**
```typescript
// Ligne 239-277 : Étape 2 repensée
- Redirection vers /upload
- Instructions claires
- Info cards (formats, taille)

// Ligne 330-336 : Bouton Continuer principal
- Toujours visible
- Label adapté (Continuer / Terminer)
- Gradient blue/indigo
```

---

### **Fichier : apps/web/app/e/[id]/page.tsx**

**Ligne 330-335 : Bouton rouvrir wizard**
```typescript
<button onClick={() => setWizardOpen(true)}>
  🪄 Besoin d'aide ? Rouvrir le guide pas à pas
</button>
```

**Placement :** Juste sous EventHealthCard

---

## ✅ VALIDATION

**Checklist corrections :**

- [x] Wizard sauvegarde étape à chaque navigation
- [x] Wizard restaure étape au réouverture
- [x] Auto-advance après invitation (avec confirmation)
- [x] Bouton "Continuer" principal toujours visible
- [x] Bouton "Passer" caché sur étapes obligatoires
- [x] Étape 2 redirige vers upload (clear)
- [x] Bouton rouvrir wizard sur page événement
- [x] State clear quand wizard terminé
- [x] 0 erreurs lint

**Status :** ✅ **TOUTES CORRECTIONS APPLIQUÉES**

---

## 💡 NOUVEAUX COMPORTEMENTS

### **Étape 1 (Invite) :**
- Clique "Inviter" → Dialog s'ouvre
- Ajoute participant → Dialog ferme
- **NOUVEAU :** Popup "Passer à l'étape suivante ?" ✅
- Ou clique "Passer" pour skip
- Ou clique "Continuer" pour avancer manuellement

### **Étape 2 (Upload) :**
- Clique "Aller à upload" → Redirigé vers `/upload?eventId=...`
- Upload photos
- Retour
- Clique "Rouvrir guide" → Wizard rouvre à étape 2
- Clique "Continuer" → Étape 3

### **Étape 3 (Analyse) :**
- Clique "Lancer analyse" → Étape 4
- Ou "Passer" pour skip
- Ou "Continuer" direct

### **Étape 4 (Identify) :**
- Clique "Terminer" → Redirigé `/events/:id/analyse`
- LocalStorage clear ✅
- Wizard terminé ✅

---

## 🐛 BUGS RÉSOLUS

✅ **Bug 1 :** Wizard ne propose pas auto-advance après invite  
✅ **Bug 2 :** Wizard reset à étape 1 après fermeture  
✅ **Bug 3 :** Pas de bouton Continuer principal  
✅ **Bug 4 :** UploadForm crash (prop inexistant)  
✅ **Bug 5 :** Impossible de rouvrir wizard après fermeture  

**Status :** ✅ **TOUS RÉSOLUS**

---

## 🚀 PROCHAINS TESTS

**Maintenant tu peux :**

1. ✅ Créer un événement
2. ✅ Suivre wizard étape par étape
3. ✅ Fermer et rouvrir (reprend où tu étais)
4. ✅ Skip les étapes optionnelles
5. ✅ Terminer le flow complet

**Le wizard devrait maintenant fonctionner parfaitement ! 🎉**

---

## 📊 AMÉLIORATION

**Avant corrections :**
- Navigation cassée
- State perdu
- User bloqué

**Après corrections :**
- Navigation fluide ✅
- State persistant ✅
- User guidé ✅
- Recovery possible ✅

---

**Teste maintenant ! Le wizard devrait être parfait ! 🚀**

