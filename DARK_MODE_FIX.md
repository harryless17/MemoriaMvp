# 🌙 CORRECTION DARK MODE - PROJET COMPLET

## ✅ Composants corrigés

### 1. ✅ Page /analyse
- Fond, cartes, textes
- Titres colorés (vert, bleu, orange)
- États de chargement
- Messages d'erreur

### 2. ✅ AssignModal.tsx
- Fond modal : `bg-white` → `bg-white dark:bg-gray-800`
- Header/Footer : Bordures dark mode
- Champ de recherche : Input avec dark mode
- Liste des membres : Cartes avec hover dark mode
- Textes français

### 3. ✅ InviteModal.tsx
- Fond modal dark mode
- Inputs (email, message) : dark mode
- Labels et textes : dark mode
- Boutons : textes français

### 4. ⏳ MergeModal.tsx (en cours)
### 5. ⏳ EventCard.tsx (en cours)
### 6. ⏳ FacePersonGrid.tsx (en cours)

---

## 🎨 Pattern utilisé

```tsx
// Background
bg-white → bg-white dark:bg-gray-800

// Borders  
border-gray-200 → border-gray-200 dark:border-gray-700

// Textes principaux
text-gray-900 → text-gray-900 dark:text-white

// Textes secondaires
text-gray-600 → text-gray-600 dark:text-gray-400
text-gray-500 → text-gray-500 dark:text-gray-400

// Inputs
bg-white dark:bg-gray-700
text-gray-900 dark:text-white
border-gray-300 dark:border-gray-600
placeholder:text-gray-500 dark:placeholder:text-gray-400

// Cards sélectionnées
bg-blue-50 → bg-blue-50 dark:bg-blue-900/30
border-blue-500 → border-blue-500 dark:border-blue-400
text-blue-800 → text-blue-800 dark:text-blue-300
```

---

## 📝 TODO

- [ ] MergeModal
- [ ] EventCard  
- [ ] FacePersonGrid
- [ ] Autres pages si nécessaire

