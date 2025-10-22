# 🚀 Guide d'Optimisation - Rendre l'App 5x Plus Rapide

## 🎯 Pourquoi C'est Lent ?

### **Problèmes Identifiés** :
1. ❌ **Indexes manquants** → Requêtes 10-100x plus lentes
2. ❌ **SELECT *** → Trop de données transférées
3. ❌ **Pas de cache** → Requêtes répétées inutilement
4. ❌ **Images non optimisées** → Chargement visuel lent
5. ❌ **Région Supabase éloignée** (peut-être) → +100-200ms de latence

---

## ⚡ Solution Rapide (15 minutes) - Gain Immédiat 50-80%

### **Étape 1 : Exécuter le Script SQL des Indexes** 🔥

1. **Ouvre Supabase Dashboard** : https://app.supabase.com
2. **Va dans SQL Editor** (icône 🗄️)
3. **Copie et exécute** le fichier :
   ```
   infra/supabase/performance_indexes.sql
   ```
4. **Clique sur "Run"** ▶️
5. ✅ **Résultat** : Toutes les requêtes sur media, likes, comments, albums seront **50-80% plus rapides**

---

## 📊 Mesurer l'Amélioration

### **Avant d'exécuter le SQL** :
1. Ouvre DevTools (F12) → **Network**
2. Recharge la page d'accueil
3. **Note le temps total** (ex: 2.5 secondes)
4. **Note les requêtes lentes** (> 500ms)

### **Après avoir exécuté le SQL** :
1. Recharge la page (Ctrl+R)
2. **Compare** :
   - Temps total devrait être **< 1 seconde**
   - Requêtes devraient être **< 200ms**

---

## 🔍 Vérifier la Région Supabase

### **Ton Projet est Où ?** 🌍

1. **Supabase Dashboard** → **Settings** → **General**
2. Regarde **Region** :
   - `us-east-1` = USA Est (Virginie)
   - `eu-west-1` = Europe Ouest (Irlande)
   - `eu-central-1` = Europe Centrale (Francfort)

### **Tu es Où ?**
- 🇫🇷 France → Idéal : `eu-west-1` ou `eu-central-1`
- 🇺🇸 USA → Idéal : `us-east-1` ou `us-west-1`
- 🇦🇫 Maghreb/Afrique → Idéal : `eu-west-1`

### **Si la Région est Loin** :
- **Latence** : +100-200ms par requête
- **Solution** : Créer un nouveau projet dans ta région et migrer

---

## 🎨 Optimisations Supplémentaires (Optionnel)

### **1. Optimiser les Sélections SQL** (30 min)

#### **Remplace les SELECT \*** :
```typescript
// ❌ Avant
const { data } = await supabase.from('media').select('*');

// ✅ Après
const { data } = await supabase.from('media').select('id, type, storage_path, created_at');
```

**Gain** : 20-40% moins de données transférées

---

### **2. Activer le Cache** (1h)

Tu as déjà le fichier `src/lib/cache.ts` ! Utilise-le :

```typescript
import { cache } from '@/lib/cache';

// Cache les profils pendant 5 minutes
const profile = await cache.get(
  `profile-${userId}`, 
  async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single();
    return data;
  },
  5 * 60 * 1000 // 5 min
);
```

**À cacher** :
- ✅ Profils (5-10 min)
- ✅ Événements (2-5 min)
- ✅ Albums (2-5 min)
- ❌ Likes/commentaires (temps réel)

**Gain** : 30-50% sur les visites répétées

---

### **3. Optimiser les Images** (2h)

#### **Problème Actuel** :
- Images 4K chargées en pleine résolution
- Pas de compression
- Pas de lazy loading

#### **Solutions** :

**A. Utiliser Next.js Image Component** :
```typescript
import Image from 'next/image';

// ❌ Avant
<img src={mediaUrl} alt="" />

// ✅ Après
<Image 
  src={mediaUrl} 
  alt=""
  width={400}
  height={400}
  loading="lazy"
  quality={80}
/>
```

**B. Générer des Thumbnails à l'Upload** :
```typescript
// Lors de l'upload, créer une miniature
const thumbnail = await resizeImage(file, { width: 400, height: 400 });
```

**Gain** : 40-60% de chargement visuel plus rapide

---

## 📈 Résultats Attendus

| Action | Temps | Gain | Difficulté |
|--------|-------|------|------------|
| **Indexes SQL** | 15 min | **50-80%** | ⚡ Facile |
| **SELECT ciblé** | 30 min | 20-40% | ⚡ Facile |
| **Cache** | 1h | 30-50% | 🟡 Moyen |
| **Images** | 2h | 40-60% | 🔴 Avancé |
| **Région proche** | 5 min | 100-200ms | ⚡ Facile |

### **Total Potentiel** : **2-5x plus rapide** 🚀

---

## 🧪 Checklist de Validation

### **Performance Cible** :
- [ ] Page d'accueil : **< 1 seconde**
- [ ] Page événement : **< 800ms**
- [ ] MediaViewer : **< 500ms**
- [ ] Compteurs de likes : **affichage instantané**
- [ ] Commentaires : **< 200ms**

### **DevTools Network** :
- [ ] Requêtes Supabase : **< 200ms** en moyenne
- [ ] Pas de requêtes > 500ms
- [ ] Moins de 10 requêtes par page

---

## 🎯 Plan d'Action Recommandé

### **Phase 1 : Quick Wins (15 min)** 🔥
1. ✅ Exécute `performance_indexes.sql`
2. ✅ Recharge et teste
3. **Gain : 50-80%**

### **Phase 2 : Optimisations (1h)** ⚡
1. ✅ SELECT ciblé sur les requêtes principales
2. ✅ Activer le cache pour profils/événements
3. **Gain : +30-40%**

### **Phase 3 : Images (2h)** 🎨
1. ✅ Next.js Image avec lazy loading
2. ✅ Thumbnails à l'upload
3. **Gain : +40-60% visuel**

### **Phase 4 : Région (5 min)** 🌍
1. ✅ Vérifier région Supabase
2. ✅ Si loin, migrer
3. **Gain : -100-200ms latence**

---

## 📝 Commandes Utiles

### **Voir l'utilisation des indexes** :
```sql
SELECT 
  tablename,
  indexname,
  idx_scan as utilisations
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### **Voir les requêtes lentes** :
```sql
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ❓ FAQ

### **Q: Pourquoi les indexes sont si importants ?**
**R:** Sans index, Postgres scanne **toutes les lignes** (ex: 10,000 lignes). Avec index, il trouve directement (ex: 10 lignes). **1000x plus rapide**.

### **Q: Les indexes ralentissent-ils les writes ?**
**R:** Très légèrement (5-10ms par insert). Mais les reads sont **50-100x plus rapides**, donc ça vaut largement le coup.

### **Q: Combien d'indexes puis-je avoir ?**
**R:** Autant que nécessaire. Postgres gère très bien 20-50 indexes par table.

### **Q: Le cache peut-il montrer des données périmées ?**
**R:** Oui, mais on définit un TTL court (2-5 min). Pour les likes/commentaires, **pas de cache** (temps réel).

---

**🚀 Commence par exécuter `performance_indexes.sql` maintenant ! C'est le plus gros impact pour le moins d'effort.**

Besoin d'aide ? Vérifie `DIAGNOSTIC_PERFORMANCE.md` pour les détails techniques.

