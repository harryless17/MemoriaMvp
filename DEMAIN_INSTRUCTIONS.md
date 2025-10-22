# 🚀 Instructions pour demain

## ⚠️ PROBLÈME IDENTIFIÉ

Le système traite **des centaines de vieux jobs `detect`** qui bloquent le poller.
Ces jobs doivent être supprimés avant de relancer le système.

---

## 📝 ÉTAPES À SUIVRE DEMAIN

### 1️⃣ Nettoyer les vieux jobs dans Supabase

**Va sur Supabase → SQL Editor et exécute :**

```sql
-- Nettoyer tous les vieux jobs detect qui bloquent le système
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status = 'pending';

-- Nettoyer aussi les jobs detect completed/failed de plus de 1 jour
DELETE FROM ml_jobs 
WHERE job_type = 'detect' 
AND status IN ('completed', 'failed')
AND created_at < NOW() - INTERVAL '1 day';

-- Afficher le résultat
SELECT 
  job_type,
  status,
  COUNT(*) as count
FROM ml_jobs
GROUP BY job_type, status
ORDER BY job_type, status;
```

**Tu devrais voir :**
- Soit 0 jobs
- Soit uniquement des jobs `cluster` (pas de `detect`)

---

### 2️⃣ Démarrer le système complet

```bash
cd /home/aghiles/Bureau/MemoriaMvp
make up-all
```

Cette commande va :
1. Arrêter tout ce qui tourne
2. Te redemander de confirmer le SQL (appuie juste sur ENTER si déjà fait)
3. Démarrer le worker ML (20s d'attente)
4. Démarrer le frontend Next.js (10s d'attente)
5. Afficher les URLs

---

### 3️⃣ Tester le système

1. **Ouvre le navigateur** : http://localhost:3000
2. **Va sur un événement** → `/analyse`
3. **Clique sur "Analyser les photos"**
4. **Attends 10 secondes**
5. **Vérifie les logs** :
   ```bash
   make test-tags
   ```

**Tu devrais voir :**
```
Found X linked clusters, creating tags...
Cluster XXXXX: Y faces, linked_user_id: ZZZZZ
✅ Created tag for media XXXXX -> member YYYYY
```

---

## 🎯 Commandes utiles

### Démarrage
```bash
make up-all      # Tout démarrer (ML + Frontend)
make up          # Uniquement le worker ML
```

### Arrêt
```bash
make down-all    # Tout arrêter
make down        # Uniquement le worker ML
```

### Logs
```bash
make logs-worker    # Logs du worker ML
make logs-frontend  # Logs du frontend
make test-tags      # Vérifier les tags créés
```

### Maintenance
```bash
make clean-jobs  # Afficher le SQL de nettoyage
make status      # Status des containers
make restart     # Redémarrer le worker
make clean       # Nettoyer complètement
make help        # Afficher toutes les commandes
```

---

## 🔧 Ce qui a été corrigé aujourd'hui

1. ✅ **Erreur d'indentation** dans le code de création des tags (CRITIQUE)
2. ✅ **Erreur enum `tag_source`** : changé de `'ai'` à `'face_clustering'`
3. ✅ **Mise à jour en mémoire** des faces après assignation
4. ✅ **Makefile complet** pour gérer tout le système
5. ✅ **Scripts de démarrage/arrêt** pour ML + Frontend

---

## 🎉 État actuel

Le code est **100% prêt** ! Il ne reste plus qu'à :
1. Nettoyer les vieux jobs (SQL ci-dessus)
2. Lancer `make up-all`
3. Tester sur `/analyse`

**Le système devrait créer automatiquement les tags pour toutes les photos des personas liés !** 🚀

---

## 🆘 En cas de problème

### Le frontend ne démarre pas ?
```bash
cd apps/web
pnpm install
cd ../..
make up-all
```

### Le worker ne répond pas ?
```bash
make restart
make logs-worker
```

### Toujours des vieux jobs ?
```bash
# Relance le SQL de nettoyage dans Supabase
make clean-jobs
```

### Tout casser et recommencer ?
```bash
make clean
make up-all
```

---

**Bonne nuit et à demain ! 😴**

