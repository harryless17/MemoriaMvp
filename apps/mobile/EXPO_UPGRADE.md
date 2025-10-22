# 🚀 Migration Expo SDK 52 → 54

## ✅ Changements effectués

### `package.json`
- ✅ **Expo SDK** : `~52.0.0` → `~54.0.0`
- ✅ **React Native** : `0.76.5` → `0.78.0`
- ✅ **Expo Router** : `~4.0.0` → `~5.0.0`
- ✅ **Expo Camera** : `~16.0.0` → `~17.0.0`
- ✅ **Expo File System** : `~18.0.0` → `~19.0.0`
- ✅ **Expo Image Picker** : `~16.0.0` → `~17.0.0`
- ✅ **Expo Linking** : `~7.0.0` → `~8.0.0`
- ✅ **Expo Status Bar** : `~2.0.0` → `~2.1.0`
- ✅ **React Native Gesture Handler** : `~2.20.2` → `~2.22.0`
- ✅ **React Native Reanimated** : `~3.16.1` → `~3.18.0`
- ✅ **React Native Safe Area Context** : `4.12.0` → `4.15.0`
- ✅ **React Native Screens** : `~4.3.0` → `~4.5.0`
- ✅ **Async Storage** : `^2.0.0` → `^2.1.0`

### `app.json`
- ✅ Ajout de `runtimeVersion` pour les mises à jour OTA

---

## 📦 Étapes d'installation

### 1️⃣ Nettoyer le projet
```bash
cd apps/mobile

# Supprimer node_modules et lock files
rm -rf node_modules
rm -rf .expo
rm package-lock.json  # ou yarn.lock si tu utilises Yarn

# Si tu es à la racine du monorepo
pnpm install
```

### 2️⃣ Installer les dépendances
```bash
# À la racine du monorepo
pnpm install

# Ou spécifiquement pour mobile
cd apps/mobile
pnpm install
```

### 3️⃣ Nettoyer le cache Expo
```bash
cd apps/mobile
npx expo start -c
# ou
pnpm dev -c
```

### 4️⃣ Tester sur simulateur/émulateur
```bash
# iOS
pnpm ios

# Android
pnpm android
```

---

## 🔧 Breaking Changes potentiels (SDK 54)

### **Expo Router 5**
- ✅ Nouvelles APIs de navigation
- ✅ Meilleure gestion des types
- ⚠️ Certains hooks ont changé (vérifie la doc si erreurs)

### **React Native 0.78**
- ✅ Amélioration des performances
- ✅ Nouveau moteur JS Hermes activé par défaut
- ⚠️ Certains composants dépréciés peuvent avoir changé

### **Expo Camera 17**
- ✅ Nouvelles permissions granulaires
- ✅ Meilleure gestion de la caméra
- ⚠️ L'API a légèrement changé (vérifie `upload.tsx` si besoin)

---

## ⚠️ À vérifier après migration

### Tests fonctionnels
- [ ] **Login/Signup** fonctionne
- [ ] **Upload de médias** (caméra + galerie)
- [ ] **Feed** s'affiche correctement
- [ ] **Viewer** avec likes & comments
- [ ] **Deep linking** (QR codes)
- [ ] **Navigation** entre les écrans

### Tests de performance
- [ ] Pas de ralentissements
- [ ] Pas de crashes
- [ ] Les images se chargent bien

---

## 🆘 En cas de problème

### Erreur de dépendances
```bash
# Réinstaller proprement
cd apps/mobile
rm -rf node_modules .expo
cd ../..
pnpm install
```

### Erreur de cache
```bash
# Nettoyer tous les caches
npx expo start -c
# ou
watchman watch-del-all  # macOS uniquement
```

### Erreur de build natif
```bash
# iOS
cd ios && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

### Problème de TypeScript
```bash
# Régénérer les types Expo Router
npx expo customize tsconfig.json
```

---

## 📚 Ressources

- [Expo SDK 54 Release Notes](https://expo.dev/changelog/2025/01-14-sdk-54)
- [Expo Router 5 Guide](https://docs.expo.dev/router/introduction/)
- [React Native 0.78 Changelog](https://reactnative.dev/blog/2025/01/10/version-0.78)

---

## ✅ Checklist post-migration

- [ ] App démarre sans erreur
- [ ] Toutes les features fonctionnent
- [ ] Pas de warnings critiques
- [ ] Tests de build OK (iOS + Android)
- [ ] Mise à jour de `eas.json` si nécessaire

---

**Dernière mise à jour** : Janvier 2025

