# 🔍 Diagnostic Performance - Pourquoi les Requêtes Sont Lentes ?

## 🐌 Causes Possibles de Lenteur

### **1. Indexes Manquants** ❌
Les requêtes sans index peuvent être **10-100x plus lentes**.

#### **Vérification**
Regarde ton fichier `infra/supabase/schema.sql` - Indexes actuels :
```sql
CREATE INDEX idx_events_visibility_created ON events (visibility, created_at DESC);
CREATE INDEX idx_media_event ON media (event_id, created_at DESC);
CREATE INDEX idx_media_visibility_created ON media (visibility, created_at DESC);
CREATE INDEX idx_comments_media ON comments (media_id, created_at ASC);
CREATE INDEX idx_likes_media ON likes (media_id);
```

#### **Indexes Manquants (Probables)** 🚨
- ❌ Pas d'index sur `media(user_id)` pour les profils utilisateurs
- ❌ Pas d'index sur `likes(user_id)` pour vérifier si l'utilisateur a liké
- ❌ Pas d'index sur `comments(user_id)` pour les commentaires d'un user
- ❌ Pas d'index sur `album_media(album_id, added_at)` pour trier
- ❌ Pas d'index sur `album_collaborators(user_id)` pour les albums partagés

---

### **2. RLS (Row Level Security) Mal Optimisée** 🔒
Les policies RLS sont exécutées **à chaque requête** et peuvent être lentes.

#### **Problèmes Typiques**
```sql
-- ❌ RLS avec sous-requête (LENT)
CREATE POLICY "media_select" ON media FOR SELECT
USING (
  visibility = 'public' 
  OR 
  EXISTS (
    SELECT 1 FROM event_attendees 
    WHERE event_id = media.event_id 
    AND user_id = auth.uid()
  )
);
```

**Impact** : Chaque ligne testée exécute une sous-requête → **très lent**

---

### **3. Requêtes N+1** 🔁
Charger des données en boucle = **catastrophe de performance**.

#### **Exemple dans ton Code**
```typescript
// ❌ N+1 Problem
for (const media of mediaList) {
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', media.user_id)
    .single();
}
// 10 médias = 10 requêtes → 500-1000ms
```

**Solution** : Charger tous les profils en 1 fois
```typescript
// ✅ Optimisé
const userIds = mediaList.map(m => m.user_id);
const { data: users } = await supabase
  .from('profiles')
  .select('*')
  .in('id', userIds);
// 10 médias = 1 requête → 50-100ms
```

---

### **4. SELECT * au Lieu de Champs Ciblés** 📦
Charger toutes les colonnes = **transfert de données inutiles**.

#### **Dans Ton Code**
```typescript
// ❌ Charge tout (même les gros champs)
.select('*')

// ✅ Charge seulement ce qui est nécessaire
.select('id, title, created_at, visibility')
```

**Impact** : 
- `SELECT *` → 2-5 KB par ligne
- Sélection ciblée → 0.5-1 KB par ligne
- **Gain : 3-5x moins de données**

---

### **5. Pas de Cache** 💾
Chaque visite = nouvelles requêtes, même pour les données statiques.

#### **Données à Cacher**
- ✅ Profils utilisateurs (changent rarement)
- ✅ Événements publics (changent peu)
- ✅ Compteurs de likes/commentaires (peuvent être décalés de quelques secondes)

---

### **6. Distance Géographique Supabase** 🌍
Si ton projet Supabase est aux **USA** et toi en **Europe** :
- **Latence** : 100-200ms par requête (aller-retour réseau)
- **Solution** : Créer un projet dans la région la plus proche

---

### **7. Plan Gratuit Supabase** 💸
Le plan gratuit a des **limites de performance** :
- CPU partagé
- RAM limitée
- Connexions limitées
- Pas de CDN pour les médias

---

### **8. Images Non Optimisées** 🖼️
Charger des images 4K en pleine résolution = **très lent**.

#### **Problèmes**
- ❌ Pas de thumbnails pour les grilles
- ❌ Pas de compression
- ❌ Pas de formats modernes (WebP)
- ❌ Pas de lazy loading natif

---

## 🛠️ Solutions Par Priorité

### **🔥 PRIORITÉ 1 : Indexes Manquants (Impact Immédiat)**

**Script SQL à exécuter** :
```sql
-- Indexes critiques pour la performance

-- Media
CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

-- Likes
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at DESC);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Albums
CREATE INDEX IF NOT EXISTS idx_album_media_album ON album_media(album_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_media_media ON album_media(media_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_user ON album_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_album ON album_collaborators(album_id);

-- Stories
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- Media Views
CREATE INDEX IF NOT EXISTS idx_media_views_media ON media_views(media_id);
CREATE INDEX IF NOT EXISTS idx_media_views_user ON media_views(user_id);
```

**Gain Attendu** : **50-80% plus rapide** sur les requêtes concernées

---

### **⚡ PRIORITÉ 2 : Optimiser les Policies RLS**

**Vérifier les policies lentes** :
```sql
-- Analyser les requêtes lentes
SELECT 
  schemaname, tablename, 
  indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan < 10
ORDER BY idx_tup_read DESC;
```

**Simplifier les policies** :
```sql
-- ❌ Éviter les EXISTS imbriqués
-- ✅ Utiliser des index et des conditions simples
```

---

### **🚀 PRIORITÉ 3 : Implémenter un Cache**

**LocalStorage Cache** (déjà prévu dans ton code `src/lib/cache.ts`) :
```typescript
import { cache } from '@/lib/cache';

// Cache les profils pendant 5 minutes
const profile = await cache.get('profile-123', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '123')
    .single();
  return data;
}, 5 * 60 * 1000); // 5 minutes
```

**Ce qui devrait être caché** :
- ✅ Profils utilisateurs (5-10 min)
- ✅ Événements (2-5 min)
- ✅ Albums (2-5 min)
- ❌ Likes/commentaires (temps réel)

---

### **📦 PRIORITÉ 4 : Optimiser les Images**

**Solutions** :
1. **Thumbnails** : Créer des miniatures à l'upload
2. **Compression** : Utiliser TinyPNG/ImageOptim
3. **WebP** : Format moderne 30% plus léger
4. **Lazy Loading** : Charger les images au scroll

**Supabase Storage Transformations** (disponible sur certains plans) :
```typescript
const thumbUrl = supabase
  .storage
  .from('media')
  .getPublicUrl(path, {
    transform: {
      width: 400,
      height: 400,
      resize: 'cover',
      quality: 80
    }
  });
```

---

### **🌍 PRIORITÉ 5 : Région Supabase**

**Vérifier ta région actuelle** :
1. Va dans **Supabase Dashboard** → **Settings** → **General**
2. Regarde **Region** (ex: `us-east-1`, `eu-west-1`)

**Si tu es en Europe et le projet en USA** :
- **Latence** : +100-150ms par requête
- **Solution** : Créer un nouveau projet dans `eu-west-1` ou `eu-central-1`

---

## 📊 Mesurer la Performance Actuelle

### **1. Ouvrir DevTools** (F12)
- Onglet **Network**
- Filtre : **Fetch/XHR**
- Recharge la page

### **2. Identifier les Requêtes Lentes**
Cherche les requêtes avec :
- **Time > 500ms** → 🔴 Très lent
- **Time > 200ms** → 🟠 Lent
- **Time < 100ms** → 🟢 OK

### **3. Exemple de Diagnostic**
```
POST /rest/v1/media?select=*           → 850ms 🔴
GET  /rest/v1/profiles?id=in.(...)     → 420ms 🟠
GET  /rest/v1/events?visibility=eq...  → 180ms 🟠
POST /rest/v1/likes?select=*,count     → 95ms  🟢
```

**Actions** :
- `media` lent → Vérifier index + RLS
- `profiles` moyen → Ajouter cache
- `events` moyen → Sélection ciblée
- `likes` OK → Rien à faire

---

## 🎯 Plan d'Action Recommandé

### **Étape 1 : Indexes (15 min)** 🔥
1. Exécute le script SQL des indexes manquants
2. Recharge l'app
3. **Gain attendu : 50-80%**

### **Étape 2 : Sélection Ciblée (30 min)** ⚡
1. Remplace `SELECT *` par des champs ciblés dans les requêtes principales
2. **Gain attendu : 20-40%**

### **Étape 3 : Cache LocalStorage (1h)** 💾
1. Implémenter le cache pour les profils
2. Implémenter le cache pour les événements
3. **Gain attendu : 30-50% (visites répétées)**

### **Étape 4 : Optimiser Images (2h)** 📦
1. Générer des thumbnails à l'upload
2. Utiliser Next.js Image avec lazy loading
3. **Gain attendu : 40-60% (chargement visuel)**

### **Étape 5 : Vérifier Région (5 min)** 🌍
1. Vérifier la région Supabase
2. Si nécessaire, créer un projet dans ta région
3. **Gain attendu : 100-200ms par requête**

---

## 🧪 Test de Validation

### **Avant Optimisations**
1. Ouvre DevTools → Network
2. Note le **temps total** de chargement
3. Note les **requêtes lentes**

### **Après Optimisations**
1. Compare les temps
2. **Objectif** :
   - Page d'accueil : < 1 seconde
   - Événement : < 800ms
   - Média viewer : < 500ms

---

## 📈 Résultats Attendus

| Optimisation | Gain Performance | Effort |
|--------------|------------------|--------|
| **Indexes** | 50-80% | 15 min ⚡ |
| **Sélection ciblée** | 20-40% | 30 min |
| **Cache** | 30-50% | 1h |
| **Images** | 40-60% | 2h |
| **Région proche** | 100-200ms | 5 min |

**Total potentiel** : **2-5x plus rapide** 🚀

---

**🔥 Commence par les indexes, c'est le plus gros impact pour le moins d'effort !**

Veux-tu que je crée le script SQL complet avec tous les indexes manquants ?

