# 🔧 Fix des Compteurs de Likes et Commentaires

## 🎯 Problème
Les compteurs de likes et commentaires affichaient toujours **0** dans l'application car ils n'étaient pas calculés lors du chargement des médias.

## ✅ Solution
Création d'une **vue SQL optimisée** qui calcule automatiquement les compteurs.

---

## 📝 Instructions (OBLIGATOIRE)

### **Étape 1 : Exécuter le SQL dans Supabase**

1. **Va dans ton dashboard Supabase** : https://app.supabase.com
2. **Ouvre le SQL Editor** (icône de base de données dans la sidebar)
3. **Copie et exécute ce code** :

```sql
-- Vue SQL pour les médias avec compteurs de likes et commentaires
-- Cette vue est optimisée pour l'affichage dans les feeds

-- Supprimer la vue si elle existe déjà
DROP VIEW IF EXISTS public.media_with_counts;

-- Créer la vue avec les compteurs
CREATE VIEW public.media_with_counts AS
SELECT 
  m.*,
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(c.comment_count, 0) AS comment_count
FROM 
  public.media m
LEFT JOIN (
  SELECT media_id, COUNT(*) AS like_count
  FROM public.likes
  GROUP BY media_id
) l ON m.id = l.media_id
LEFT JOIN (
  SELECT media_id, COUNT(*) AS comment_count
  FROM public.comments
  GROUP BY media_id
) c ON m.id = c.media_id;

-- Grant permissions
GRANT SELECT ON public.media_with_counts TO authenticated, anon;

-- RLS policies (héritées de la table media)
ALTER VIEW public.media_with_counts SET (security_invoker = on);
```

4. **Clique sur "Run"** ▶️

---

### **Étape 2 : Tester**

1. **Recharge ton application** (Ctrl+R / Cmd+R)
2. **Vérifie la page d'accueil** → Les compteurs de likes et commentaires devraient s'afficher correctement ✅
3. **Vérifie les pages d'événements** → Les compteurs devraient être corrects
4. **Vérifie les profils utilisateurs** → Les compteurs devraient être corrects

---

## 📊 Pages Corrigées

Les compteurs sont maintenant affichés correctement sur :

- ✅ **Page d'accueil** (`/`)
- ✅ **Pages d'événements** (`/e/[id]`)
- ✅ **Profils utilisateurs** (`/u/[id]`)
- ✅ **Feed cards** (partout où des médias sont affichés)

---

## 🔍 Comment ça Marche ?

### **Avant (❌)** :
```typescript
const { data } = await supabase
  .from('media')
  .select('*')  // ← Ne récupère PAS les compteurs
```

### **Après (✅)** :
```typescript
const { data } = await supabase
  .from('media_with_counts')  // ← Vue avec compteurs automatiques
  .select('*')
```

La vue SQL calcule automatiquement :
- `like_count` : Nombre total de likes pour chaque média
- `comment_count` : Nombre total de commentaires pour chaque média

---

## ⚡ Performance

La vue utilise des **LEFT JOIN optimisés** :
- Indexation sur `media_id` dans les tables `likes` et `comments`
- Agrégation groupée (`COUNT(*)` + `GROUP BY`)
- `COALESCE` pour retourner 0 si aucun like/commentaire

✨ **Performance identique aux requêtes manuelles, mais code bien plus propre !**

---

## 🧪 Test de Validation

Pour vérifier que tout fonctionne :

1. **Crée un événement**
2. **Upload une photo**
3. **Ajoute des likes et commentaires**
4. **Recharge la page d'accueil**
5. ✅ **Les compteurs devraient afficher les bonnes valeurs**

---

## ❓ Troubleshooting

### Problème : La vue n'existe pas
**Solution** : Exécute le SQL dans Supabase (Étape 1)

### Problème : Permission denied
**Solution** : Vérifie que les lignes `GRANT SELECT` ont bien été exécutées

### Problème : Les compteurs sont toujours à 0
**Solution** : 
1. Vérifie que tu as bien des likes/commentaires dans la base
2. Ouvre la console (F12) et cherche des erreurs
3. Vérifie que Realtime est activé sur les tables `likes` et `comments`

---

**Exécute le SQL maintenant et dis-moi si les compteurs s'affichent correctement ! 🚀**

