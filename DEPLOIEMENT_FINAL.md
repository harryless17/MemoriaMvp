# 🚀 DÉPLOIEMENT ET TESTS - VERSION SIMPLIFIÉE

## ✅ Ce qui a été corrigé

### 1. **Edge Function `ml-enqueue` simplifiée**
- ❌ Supprimé TOUT le code obsolète des jobs `detect`
- ✅ Workflow simplifié : détecte nouvelles photos → cluster faces unassigned
- ✅ Plus de bugs, code 90% plus court

### 2. **Worker déjà parfait**
- ✅ Détecte uniquement nouvelles photos
- ✅ Préserve clusters "linked" existants
- ✅ Assigne nouvelles faces aux clusters existants (fusion automatique)
- ✅ Crée media_tags automatiquement
- ✅ Crée nouveaux clusters pour faces différentes

---

## 📋 PLAN DE DÉPLOIEMENT

### Étape 1 : Déployer l'Edge Function ⚡

```bash
# Navigue vers le dossier Supabase
cd /home/aghiles/Bureau/MemoriaMvp/supabase

# Déploie l'Edge Function
supabase functions deploy ml-enqueue
```

**OU** si tu utilises Supabase CLI local :
```bash
# Push vers ton projet Supabase
supabase functions deploy ml-enqueue --project-ref TON_PROJECT_REF
```

### Étape 2 : Redémarrer le worker 🔄

```bash
cd /home/aghiles/Bureau/MemoriaMvp
make down-all
make up-all
```

### Étape 3 : Vérifier les jobs failed (optionnel) 🔍

Lance ce SQL dans Supabase pour voir pourquoi certains jobs ont échoué :
```sql
-- Fichier: check_failed_jobs.sql
SELECT 
  id,
  job_type,
  status,
  error,
  attempts,
  created_at
FROM ml_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 TEST COMPLET

### Test 1 : Tester avec les 17 faces unassigned existantes

1. **Va sur la page d'analyse** : `/events/[ton-event-id]/analyse`

2. **Clique sur "Analyser les photos"**

3. **Attends 5-10 secondes** (le temps que la détection + clustering se fasse)

4. **Vérifie dans la DB** :
```sql
-- Combien de faces sont maintenant assignées ?
SELECT 
  CASE 
    WHEN face_person_id IS NULL THEN 'unassigned'
    ELSE 'assigned'
  END as status,
  COUNT(*) as count
FROM faces
GROUP BY status;

-- Combien de clusters ?
SELECT 
  status,
  COUNT(*) as count
FROM face_persons
GROUP BY status;
```

**Résultat attendu :**
- 0 faces unassigned (les 17 doivent être assignées)
- 1-2 nouveaux clusters "pending" créés (si les 17 faces sont de personnes différentes)
- OU 0 nouveaux clusters (si les 17 faces matchent le cluster "linked" existant)

### Test 2 : Upload de nouvelles photos

1. **Upload 3-5 photos d'une nouvelle personne**

2. **Clique sur "Analyser les photos"**

3. **Vérifie qu'un nouveau cluster "pending" est créé**

```sql
SELECT 
  id,
  status,
  created_at,
  (SELECT COUNT(*) FROM faces WHERE face_person_id = face_persons.id) as faces_count
FROM face_persons
ORDER BY created_at DESC
LIMIT 3;
```

**Résultat attendu :**
- 1 nouveau cluster "pending" avec 3-5 faces

### Test 3 : Upload de photos de la personne déjà "linked"

1. **Upload 2-3 photos de la personne déjà identifiée (cluster linked)**

2. **Clique sur "Analyser les photos"**

3. **Vérifie que les nouvelles faces sont assignées au cluster existant**

```sql
-- Le cluster linked devrait avoir plus de faces
SELECT 
  id,
  status,
  linked_user_id,
  (SELECT COUNT(*) FROM faces WHERE face_person_id = face_persons.id) as faces_count
FROM face_persons
WHERE status = 'linked';

-- Les tags devraient être créés automatiquement
SELECT COUNT(*) FROM media_tags WHERE source = 'face_clustering';
```

**Résultat attendu :**
- Le cluster "linked" a maintenant 10 + 2-3 faces = 12-13 faces
- Les media_tags sont créés automatiquement (count augmente)

---

## 🐛 DEBUGGING

### Si aucun nouveau cluster n'est créé :

1. **Vérifie les logs du worker** :
```bash
docker-compose logs -f ml-worker
```

2. **Cherche ces messages** :
- `📸 Found X media without faces` → Confirme détection
- `Clustering X faces...` → Confirme clustering
- `Clustering complete: X clusters, Y noise faces` → Résultats

### Si les faces restent "unassigned" :

1. **Vérifie que DBSCAN trouve des clusters** :
```bash
# Logs du worker
grep "Clustering complete" 
```

2. **Vérifie le cluster_epsilon** :
```bash
docker-compose exec ml-worker env | grep CLUSTER
```

Devrait afficher :
```
CLUSTER_EPSILON=0.55
MIN_CLUSTER_SIZE=2
```

### Si les jobs échouent :

1. **Lance le SQL `check_failed_jobs.sql`** pour voir l'erreur exacte

2. **Vérifie les permissions Supabase** :
- Service role key configurée ?
- RLS policies correctes ?

---

## 📊 MÉTRIQUES DE SUCCÈS

Après les tests, tu devrais avoir :

- ✅ 0 faces unassigned (ou très peu si nouvelles photos uploadées)
- ✅ Clusters créés automatiquement pour nouvelles personnes
- ✅ Faces assignées automatiquement aux clusters existants
- ✅ Media_tags créés automatiquement pour clusters "linked"
- ✅ Pas de jobs "failed" (ou très peu)

---

## 🎉 SI TOUT FONCTIONNE

**Félicitations ! Le système fonctionne comme prévu !** 🚀

Tu peux maintenant :
1. Inviter des participants
2. Leur faire identifier leurs clusters (linked)
3. Les nouvelles photos seront automatiquement taggées

---

## ❌ SI PROBLÈMES

**Copie-colle :**
1. Les logs du worker
2. Les résultats SQL des tests
3. Le message d'erreur exact

Et on debug ensemble ! 🔧

