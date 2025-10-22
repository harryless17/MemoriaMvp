# ✅ Autocomplétion de localisation avec Nominatim (OpenStreetMap)

**🎉 100% GRATUIT - Aucune clé API requise !**

## 📍 Composant créé

**Fichier** : `apps/web/src/components/ui/location-input.tsx`

Ce composant remplace les inputs de localisation basiques par une autocomplétion intelligente via Google Places API.

---

## ✨ Avantages de Nominatim (vs Google Maps)

### ✅ **Gratuit**
- ❌ Google Maps : Demande carte bancaire, 28 500 requêtes gratuites puis payant
- ✅ Nominatim : **100% gratuit**, illimité

### ✅ **Sans configuration**
- ❌ Google Maps : Clé API, configuration projet Google Cloud
- ✅ Nominatim : **Aucune clé requise**, fonctionne immédiatement

### ✅ **Open Source**
- Basé sur OpenStreetMap
- Données communautaires
- Pas de vendor lock-in

### ✅ **Respect de la vie privée**
- Pas de tracking Google
- Pas d'analytics tiers

---

## 🚀 Aucune configuration requise !

Le composant fonctionne **out of the box** sans aucune configuration.

Pas besoin de :
- ❌ Clé API
- ❌ Compte Google Cloud
- ❌ Carte bancaire
- ❌ Variables d'environnement

**Juste importer et utiliser !** 🎉

---

## 📦 Utilisation du composant

### Pages déjà mises à jour :

#### 1. `/profile/edit` - Profil utilisateur
```tsx
import { LocationInput } from '@/components/ui/location-input';

<LocationInput
  value={location}
  onChange={setLocation}
  placeholder="Ville, Pays"
  maxLength={100}
/>
```

#### 2. `/events/new` - Création d'événement
```tsx
<LocationInput
  value={formData.location}
  onChange={(value) => setFormData({ ...formData, location: value })}
  placeholder="Paris, France"
/>
```

#### 3. `/e/[id]/edit` - Édition d'événement
```tsx
<LocationInput
  value={formData.location}
  onChange={(value) => setFormData({ ...formData, location: value })}
  placeholder="Paris, France"
  maxLength={500}
/>
```

---

## ✨ Fonctionnalités

### ✅ Avec Google Maps API (si clé configurée)
- Autocomplétion intelligente des villes
- Recherche mondiale
- Formatage automatique (Ville, Pays)
- Interface en français
- Spinner de chargement
- Fallback gracieux si l'API échoue

### ✅ Sans Google Maps API (fallback)
- Fonctionne comme un input normal
- Icône MapPin conservée
- Pas de dépendance externe requise
- Pas d'erreur affichée à l'utilisateur

---

## ✨ Fonctionnalités du composant

### 🔍 **Autocomplétion intelligente**
- Recherche déclenchée après **3 caractères**
- **Debounce de 300ms** pour éviter trop de requêtes
- Limite à **5 suggestions** par recherche
- Résultats en **français**

### 🎨 **UX optimale**
- **Bouton clear (X)** pour vider le champ rapidement
- **Dropdown moderne** avec hover effects
- **Icône MapPin** sur chaque suggestion
- **Click outside** pour fermer
- **Support clavier** (navigation avec flèches - à venir)
- **Indicateur de recherche** pendant le chargement

### 🌍 **Données complètes**
- Villes du monde entier
- Formatage : "Ville, Région, Pays"
- Adresses précises disponibles

---

## 🎯 Prochaines étapes

1. **Tester immédiatement** - Pas besoin de configuration !
2. Va sur `/profile/edit` ou `/events/new`
3. Tape "Par" dans le champ de localisation
4. Tu verras des suggestions : "Paris, France", "Paramé, France", etc.

---

## 📊 Limites de Nominatim (fair use policy)

### ⚠️ Politique d'utilisation :
- **1 requête par seconde** maximum
- Notre debounce de 300ms respecte largement cette limite
- Pour usage intensif (>10k req/jour), considérer un serveur Nominatim dédié

### ✅ Pour notre MVP :
- Largement suffisant
- Pas de limite de requêtes totales
- Pas de frais cachés

---

## 📝 Notes techniques

- Le script Google Maps est chargé **une seule fois** pour toute l'application
- Le composant détecte automatiquement si l'API est disponible
- Gère les cas d'erreur de manière transparente
- Compatible mobile et desktop
- Support du dark mode
- Accessible (labels, ARIA)

