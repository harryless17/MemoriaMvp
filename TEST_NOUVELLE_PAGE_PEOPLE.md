# ⚡ TEST - NOUVELLE PAGE /PEOPLE

**Page créée :** `/events/[id]/people`  
**But :** Unifier tagging IA + Manuel en 1 seule page

---

## 🚀 COMMENT TESTER (2 MIN)

### **1. Accéder à la page**

```bash
# 1. Lance l'app
cd apps/web
pnpm dev

# 2. Va sur un événement (organisateur)
http://localhost:3000/e/[TON_EVENT_ID]

# 3. Clique sur le bouton "Identifier personnes"
# (Remplace les anciens "Taguer" et "Analyse IA")
```

**✅ Résultat attendu :**
- Redirigé vers `/events/[id]/people`
- Page moderne avec glassmorphism
- Toggle [🤖 IA] [✋ Manuel]

---

### **2. Tester le Toggle**

```bash
# Sur la nouvelle page /people

# Par défaut : Mode IA
- Vérifie que "IA Automatique" est actif (gradient purple)
- Tu vois les clusters (Identifiées, Fiables, À vérifier)

# Clique sur "Manuel"
- Mode change (gradient blue)
- Tu vois grid de photos + sidebar membres
```

**✅ Résultat attendu :**
- Toggle fonctionne smooth
- Content change entre IA et Manuel
- Design cohérent

---

### **3. Tester AI Suggestions**

```bash
# En mode IA, section "Fiables"

# Si tu as des clusters :
1. Cherche une card verte sous un cluster
2. "💡 Suggestion: [Nom] (X% sûr)"
3. "Raison: Personne très photographiée"
4. Boutons [✓ Accepter] [✗ Refuser]
```

**✅ Résultat attendu :**
- Suggestions vertes apparaissent
- % confiance affiché (40-100%)
- Raison expliquée
- Boutons fonctionnels

**Note :** Les suggestions ne marchent que si :
- Tu as des participants invités
- Tu as des clusters pending
- L'algorithme trouve un match > 40%

**Si pas de suggestions :** C'est normal, ça veut dire que l'IA n'est pas assez confiante. Elle ne suggère que si sûre.

---

### **4. Tester Mode Manuel**

```bash
# Toggle vers Manuel

1. Clique sur 2-3 photos (checkboxes)
2. Sidebar droite : Clique 1-2 membres
3. Vois compteur : "3 × 2 = 6 tags"
4. Clique "Créer 6 tags"
```

**✅ Résultat attendu :**
- Multi-select fonctionne
- Compteur temps réel
- Bouton activé uniquement si selections
- Tags créés avec succès

---

### **5. Tester Stats Header**

```bash
# En haut de page /people

Vérifie badges :
- 📸 X photos
- ✅ X taguées (Y%)
- 🤖 X visages détectés (mode IA seulement)
- 👤 X identifiés (mode IA seulement)
```

**✅ Résultat attendu :**
- Stats correctes
- Progress bar animée
- % à jour

---

## 🐛 SI ÇA NE MARCHE PAS

### **Problème 1 : Erreur "Cannot read properties of undefined"**

**Solution :** ✅ Déjà corrigé !  
Reload la page (Ctrl+R ou Cmd+R)

---

### **Problème 2 : Bouton "Identifier personnes" n'existe pas**

**Check :**
```typescript
// apps/web/app/e/[id]/page.tsx ligne ~394
// Doit avoir :
<Link href={`/events/${eventId}/people`}>
  <Button>Identifier personnes</Button>
</Link>
```

**Fix :**
- Hard refresh (Ctrl+Shift+R)
- Ou restart serveur

---

### **Problème 3 : Pas de suggestions vertes**

**C'est normal si :**
- Aucun participant invité
- Aucun cluster pending
- Algorithme pas assez confiant (<40%)

**Pour forcer des suggestions :**
- Invite plusieurs participants
- Assigne déjà 1-2 clusters
- L'algorithme apprendra

---

### **Problème 4 : Mode Manuel ne charge pas les photos**

**Check :**
- Tu es bien organisateur ?
- L'événement a des photos ?
- Console navigateur (F12) → Erreurs ?

---

## 💡 CE QUI EST NOUVEAU

**Vs ancienne page /analyse :**
- ✅ Toggle IA/Manuel
- ✅ Stats header complètes
- ✅ Progress bar globale
- ✅ AI Suggestions (cards vertes)
- ✅ Toggle suggestions ON/OFF
- ✅ Mode auto selon event settings

**Vs ancienne page /tag :**
- ✅ Intégré dans /people (mode Manuel)
- ✅ Stats en temps réel
- ✅ Progress bar visible
- ✅ Design cohérent avec mode IA

---

## ✅ VALIDATION

**Checklist rapide :**

- [ ] Page /people accessible depuis événement
- [ ] Toggle IA/Manuel fonctionne
- [ ] Mode IA affiche clusters
- [ ] Mode Manuel affiche photos + membres
- [ ] Suggestions vertes apparaissent (si applicable)
- [ ] Accept suggestion fonctionne
- [ ] Stats header correctes
- [ ] Progress bar animée
- [ ] Responsive (teste mobile view)
- [ ] Dark mode parfait

**Si tout ✅ → Page unifiée OK ! 🎉**

---

## 🎯 PROCHAINS TESTS

**Après validation de /people :**

1. **Test Notifications** (si SQL exécuté)
   - Tagge quelqu'un
   - Vois toast apparaître

2. **Test Suggestions IA** (avec vrais data)
   - Événement avec 50+ photos
   - 10+ participants
   - Vois suggestions pertinentes

3. **Test Mode Manuel** (bulk tagging)
   - Sélectionne 20 photos
   - Tagge 3 membres
   - 60 tags en 1 clic !

---

**Teste et dis-moi ce qui marche/marche pas ! 🚀**

