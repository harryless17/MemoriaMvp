# ⚡ QUICKSTART - Tester la Landing Page

## 🚀 EN 3 COMMANDES

```bash
# 1. Va dans le dossier web
cd /home/aghiles/Bureau/MemoriaMvp/apps/web

# 2. Lance le serveur
pnpm dev

# 3. Ouvre ton navigateur
http://localhost:3000
```

**Résultat attendu :**
- ✅ Redirection automatique vers `/landing`
- ✅ Landing page ultra-moderne s'affiche
- ✅ Animations smooth (orbs qui flottent)
- ✅ Scroll fluide avec toutes les sections

---

## 📱 TESTER LES FEATURES

### **1. Navigation**
- [ ] Clique "Commencer Gratuitement" → Redirige vers `/login`
- [ ] Clique "Voir la démo" → (Pas encore implémenté, normal)
- [ ] Scroll jusqu'en bas → Footer complet visible

### **2. Sections à vérifier**
- [ ] **Hero** : Headline + CTAs + Social proof
- [ ] **How it Works** : 3 étapes avec icons
- [ ] **Use Cases** : Toggle Photographes/Participants
- [ ] **Stats** : 4 chiffres géants
- [ ] **Testimonials** : 3 témoignages
- [ ] **Pricing** : 3 plans (Free, Pro ⭐, Enterprise)
- [ ] **Final CTA** : Grand encadré bleu
- [ ] **Footer** : 4 colonnes + social

### **3. Responsive**
```
Desktop (>1024px) : 3 colonnes grids
Tablet (768-1024px) : 2 colonnes
Mobile (<768px) : 1 colonne, stack vertical
```

**Tester :**
- [ ] Ouvrir DevTools (F12)
- [ ] Toggle device toolbar
- [ ] Tester iPhone 12, iPad, Desktop
- [ ] Vérifier que tout reste lisible

### **4. Dark Mode**
- [ ] Clique sur l'icône Soleil/Lune (navbar)
- [ ] Vérifie que toutes les sections s'adaptent
- [ ] Gradients restent visibles
- [ ] Texte reste lisible

### **5. Animations**
- [ ] Background : 3 orbs flottants (lent, 20s)
- [ ] Hover cards : Scale 1.05 + glow
- [ ] Buttons : Scale 1.05 au hover
- [ ] Smooth scroll

---

## 🔍 CE QUE TU DOIS VOIR

### **Hero Section**
```
┌───────────────────────────────────────────┐
│ [Badge] ✨ Reconnaissance Faciale IA      │
│                                            │
│     Partagez vos photos                   │
│     en quelques clics                     │
│                                            │
│ L'IA identifie automatiquement...         │
│                                            │
│ [Commencer Gratuitement →]                │
│ [Voir la démo]                            │
│                                            │
│ 👥 500+ photographes  ⭐⭐⭐⭐⭐  🛡️ Sécurisé │
└───────────────────────────────────────────┘
```

### **How It Works**
```
┌──────┐  ┌──────┐  ┌──────┐
│  1   │  │  2   │  │  3   │
│ 📸   │  │ 🤖   │  │ 📤   │
│Upload│  │  IA  │  │Share │
└──────┘  └──────┘  └──────┘
```

### **Pricing**
```
┌──────┐  ┌──────────┐  ┌──────┐
│ FREE │  │PRO ⭐ 29€│  │ ENTER│
│  0€  │  │ /mois    │  │PRISE │
└──────┘  └──────────┘  └──────┘
```

---

## 🎨 PERSONNALISER (Optionnel)

### **Changer le headline**
```typescript
// apps/web/app/landing/page.tsx ligne ~50
<h1 className="text-5xl md:text-7xl font-black mb-6">
  Ton nouveau texte ici
</h1>
```

### **Changer les couleurs principales**
Cherche et remplace :
- `from-blue-600 to-indigo-600` → Tes couleurs
- `from-purple-500 to-pink-600` → Tes couleurs

### **Ajouter ta vidéo demo**
```typescript
// Ligne ~150 (Demo Video Section)
<div className="aspect-video">
  <iframe 
    src="https://www.youtube.com/embed/TON_VIDEO_ID"
    className="w-full h-full rounded-xl"
  />
</div>
```

### **Vrais témoignages**
```typescript
// Ligne ~400 (Testimonials)
<TestimonialCard
  name="Ton Client"
  role="Son métier"
  avatar="TC"
  quote="Son témoignage authentique !"
  rating={5}
/>
```

---

## 🐛 TROUBLESHOOTING

### **Problème : La page ne charge pas**
```bash
# Vérifier que le serveur tourne
pnpm dev

# Vérifier les erreurs dans terminal
# Si erreur TypeScript : ignorer pour l'instant
```

### **Problème : Styles cassés**
```bash
# Rebuild Tailwind
pnpm dev

# Hard refresh navigateur
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### **Problème : Animations ne marchent pas**
- Vérifie que `globals.css` contient les animations blob
- Hard refresh
- Teste dans Chrome (meilleur support)

---

## ✅ VALIDATION RAPIDE

**Checklist 2 minutes :**

- [ ] Page s'affiche sans erreur
- [ ] Au moins 1 animation visible (orbs background)
- [ ] CTAs cliquables
- [ ] Responsive OK (teste mobile view)
- [ ] Dark mode fonctionne
- [ ] Scroll smooth jusqu'en bas

**Si tout est ✅ → Landing page prête ! 🎉**

---

## 📸 SCREENSHOT POUR PORTFOLIO

**Prendre un screenshot de :**
1. Hero section (full viewport)
2. How it works (3 cards)
3. Pricing section
4. Mobile view (iPhone)
5. Dark mode variant

**Outils recommandés :**
- [Screely.com](https://screely.com) - Mockups automatiques
- [Cleanshot](https://cleanshot.com) - Mac
- Windows Snipping Tool

---

## 🚀 PROCHAINE ÉTAPE

**Une fois validée, tu peux :**

1. **Partager le lien local** (ngrok/localtunnel) pour feedback
2. **Remplacer les placeholders** (screenshots, vidéo, témoignages)
3. **Commencer Sprint 1** (Wizard + Progress Tracker)
4. **Déployer sur Vercel** (mise en prod)

---

## 💬 BESOIN D'AIDE ?

**Si quelque chose ne marche pas :**

1. Vérifie la console navigateur (F12 → Console)
2. Vérifie le terminal (erreurs serveur)
3. Essaie un hard refresh (Ctrl+Shift+R)
4. Teste dans un navigateur différent

**Questions courantes :**

**Q : Les orbs ne bougent pas ?**  
R : Normal si GPU faible. Teste sur autre device.

**Q : Certains textes ne sont pas traduits ?**  
R : Normal, certaines sections sont en anglais (links footer par exemple).

**Q : La vidéo demo ne marche pas ?**  
R : C'est un placeholder, il faut ajouter ta vraie vidéo.

---

## 🎉 C'EST TOUT !

**Ta landing page est maintenant live en local ! 🚀**

**Next :** Passe au [ROADMAP_PRODUCTION_READY.md](./ROADMAP_PRODUCTION_READY.md) pour les prochaines étapes.

---

**Bon test ! 💪**

