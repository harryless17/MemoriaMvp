# 🚀 Face Clustering - Guide de Déploiement

## 📋 Checklist Pré-Déploiement

### ✅ Infrastructure Requise

- [ ] **Supabase Project** (PostgreSQL + Storage + Edge Functions)
- [ ] **ML Worker** (Render/Railway/Cloud Run avec 2GB RAM minimum)
- [ ] **Domaine configuré** (optionnel mais recommandé)

### ✅ Dépendances Système

- [ ] PostgreSQL 14+ avec extension `pgvector`
- [ ] Python 3.11+ pour le ML Worker
- [ ] Node.js 18+ pour les Edge Functions
- [ ] Docker (pour build du worker)

---

## 1️⃣ Déploiement Database (Supabase)

### Étape 1.1 : Activer pgvector

```sql
-- Dans Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Étape 1.2 : Exécuter le schema

```bash
# Depuis le dossier racine du projet
psql $DATABASE_URL < infra/supabase/face_clustering.sql
```

**OU** via Supabase Dashboard :
1. Aller dans `SQL Editor`
2. Copier-coller le contenu de `infra/supabase/face_clustering.sql`
3. Run

### Étape 1.3 : Vérifier les tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ml_jobs', 'face_persons', 'faces', 'media_tags');
-- Doit retourner 4 lignes
```

### Étape 1.4 : Vérifier les index

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('faces', 'face_persons', 'ml_jobs');
-- Doit retourner plusieurs index dont idx_faces_embedding (ivfflat)
```

---

## 2️⃣ Déploiement ML Worker (Python FastAPI)

### Option A : Render.com (Recommandé pour MVP)

#### 1. Créer le service

```bash
# Sur render.com
- New > Web Service
- Connect your Git repo
- Build Command: (rien, Docker auto-détecté)
- Start Command: (rien, Docker CMD utilisé)
```

#### 2. Configuration

| Variable | Valeur |
|----------|--------|
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbG... (service_role key) |
| `CALLBACK_URL` | https://xxx.supabase.co/functions/v1/ml-callback |
| `CALLBACK_SECRET` | générer un token fort (32 chars) |
| `DETECTION_THRESHOLD` | 0.5 |
| `DET_SIZE` | 640 |
| `MIN_CLUSTER_SIZE` | 3 |
| `MIN_SAMPLES` | 2 |
| `CLUSTER_EPSILON` | 0.4 |

#### 3. Ressources

- **Instance Type** : au minimum **2GB RAM** (Starter ou supérieur)
- **Region** : choisir proche de Supabase (ex: Frankfurt si Supabase EU)

#### 4. Deploy

```bash
# Le build prend 5-10 minutes (téléchargement du modèle buffalo_l)
# Vérifier les logs : "ML Worker ready"
```

#### 5. Test de santé

```bash
curl https://your-worker.onrender.com/health

# Réponse attendue :
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "model_loaded": false,  # true après première requête
#   "gpu_available": false
# }
```

### Option B : Railway.app

```bash
railway login
railway init
railway up

# Définir les variables d'environnement
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
# ... etc

# Le service se déploie automatiquement
```

### Option C : Google Cloud Run (Production)

```bash
# Build l'image
cd worker
gcloud builds submit --tag gcr.io/YOUR_PROJECT/ml-worker

# Deploy
gcloud run deploy ml-worker \
  --image gcr.io/YOUR_PROJECT/ml-worker \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 5 \
  --set-env-vars SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 3️⃣ Déploiement Edge Functions (Supabase)

### Étape 3.1 : Installer Supabase CLI

```bash
npm install -g supabase
supabase login
```

### Étape 3.2 : Lier le projet

```bash
cd /home/aghiles/Bureau/MemoriaMvp
supabase link --project-ref YOUR_PROJECT_REF
```

### Étape 3.3 : Déployer les fonctions

```bash
# Déployer toutes les fonctions
cd infra/supabase/functions

supabase functions deploy ml-enqueue
supabase functions deploy ml-callback
supabase functions deploy face-persons
supabase functions deploy face-person-actions
```

### Étape 3.4 : Configurer les secrets

```bash
# Secret pour le callback du worker
supabase secrets set ML_CALLBACK_SECRET="votre-token-32-chars"

# Vérifier
supabase secrets list
```

### Étape 3.5 : Tester les fonctions

```bash
# Test ml-enqueue (nécessite auth token)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ml-enqueue \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cluster",
    "event_id": "uuid-here",
    "priority": "normal"
  }'
```

---

## 4️⃣ Configuration Frontend

### Étape 4.1 : Variables d'environnement

Créer `.env.local` dans `apps/web/` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_WORKER_URL=https://your-worker.onrender.com
```

### Étape 4.2 : Build et déployer

```bash
cd apps/web
npm run build
npm run start  # ou déployer sur Vercel
```

---

## 5️⃣ Tests Post-Déploiement

### Test 1 : Création d'événement avec face recognition

```bash
# 1. Aller sur /events/new
# 2. Activer le toggle "Activer la reconnaissance faciale"
# 3. Vérifier que le warning RGPD s'affiche
# 4. Créer l'événement
# 5. Vérifier dans Supabase que face_recognition_enabled = true
```

### Test 2 : Upload et détection

```bash
# 1. Uploader 5-10 photos avec visages clairs
# 2. Aller sur /events/:id/analyse
# 3. Cliquer "Start Clustering"
# 4. Vérifier dans ml_jobs qu'un job 'detect' est créé
# 5. Attendre 1-2 minutes
# 6. Vérifier dans la table faces que les visages sont détectés
```

### Test 3 : Clustering

```sql
-- Vérifier les jobs
SELECT id, job_type, status, result 
FROM ml_jobs 
WHERE event_id = 'your-event-id' 
ORDER BY created_at DESC;

-- Vérifier les faces détectés
SELECT COUNT(*), event_id 
FROM faces 
WHERE event_id = 'your-event-id';

-- Vérifier les clusters créés
SELECT COUNT(*), status 
FROM face_persons 
WHERE event_id = 'your-event-id' 
GROUP BY status;
```

### Test 4 : Assign User

```bash
# 1. Sur /events/:id/analyse
# 2. Cliquer "Assign" sur un cluster
# 3. Sélectionner un membre
# 4. Cliquer "Assign & Tag"
# 5. Vérifier que des media_tags sont créés
```

```sql
-- Vérifier les tags créés
SELECT COUNT(*), source 
FROM media_tags 
WHERE media_id IN (
  SELECT id FROM media WHERE event_id = 'your-event-id'
) 
GROUP BY source;
```

### Test 5 : Merge Clusters

```bash
# 1. Cliquer "Merge" sur un cluster
# 2. Sélectionner un autre cluster
# 3. Confirmer la fusion
# 4. Vérifier que le secondary cluster a status='merged'
```

### Test 6 : GDPR Purge

```sql
-- Purge des données d'un user
SELECT purge_face_data_for_user(
  'user-uuid'::uuid,
  'event-uuid'::uuid
);

-- Vérifier que les données sont supprimées
SELECT COUNT(*) FROM faces 
WHERE face_person_id IN (
  SELECT id FROM face_persons 
  WHERE linked_user_id = 'user-uuid' 
    AND event_id = 'event-uuid'
);
-- Doit retourner 0
```

---

## 6️⃣ Monitoring & Logs

### Worker Logs (Render)

```bash
# Dashboard Render > Service > Logs
# Rechercher :
# - "Processing media X for job Y"
# - "Detected N faces"
# - "Clustering complete: X clusters"
# - Erreurs éventuelles
```

### Edge Functions Logs (Supabase)

```bash
# Dashboard Supabase > Edge Functions > Logs
# Ou via CLI :
supabase functions logs ml-callback --limit 100
```

### Database Monitoring

```sql
-- Jobs en attente
SELECT COUNT(*) FROM ml_jobs WHERE status = 'pending';

-- Jobs en erreur
SELECT id, error, attempts 
FROM ml_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Temps moyen de processing
SELECT 
  job_type,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM ml_jobs 
WHERE status = 'completed'
GROUP BY job_type;
```

### Métriques Clés

```sql
-- Events avec face recognition activé
SELECT COUNT(*) FROM events WHERE face_recognition_enabled = true;

-- Coverage : % photos avec visages détectés
SELECT 
  e.id,
  e.name,
  COUNT(DISTINCT m.id) as total_media,
  COUNT(DISTINCT f.media_id) as media_with_faces,
  ROUND(COUNT(DISTINCT f.media_id) * 100.0 / NULLIF(COUNT(DISTINCT m.id), 0), 1) as coverage_pct
FROM events e
LEFT JOIN media m ON m.event_id = e.id
LEFT JOIN faces f ON f.media_id = m.id
WHERE e.face_recognition_enabled = true
GROUP BY e.id, e.name;
```

---

## 7️⃣ Troubleshooting

### ❌ Worker ne démarre pas

```bash
# Vérifier les logs Docker
docker logs container-id

# Problème fréquent : timeout chargement modèle
# Solution : augmenter RAM à 2GB minimum

# Vérifier l'accès Supabase
curl https://xxx.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

### ❌ Faces non détectés

```sql
-- Vérifier les jobs
SELECT * FROM ml_jobs WHERE event_id = 'xxx' ORDER BY created_at DESC;

-- Si status='failed', regarder l'erreur
SELECT id, error FROM ml_jobs WHERE status = 'failed';

-- Problèmes fréquents :
-- - URL signée expirée (regénérer)
-- - Image corrompue
-- - Timeout worker (augmenter timeout)
```

### ❌ Clustering ne se lance pas

```bash
# Vérifier les conditions dans ml-callback edge function
# - Au moins 10 faces détectés
# - Au moins 80% des médias traités

# Forcer le clustering manuellement :
curl -X POST https://xxx.supabase.co/functions/v1/ml-enqueue \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"type": "cluster", "event_id": "xxx"}'
```

### ❌ Callback 401 Unauthorized

```bash
# Vérifier que ML_CALLBACK_SECRET correspond dans :
# 1. Worker env vars (CALLBACK_SECRET)
# 2. Edge Function secrets (ML_CALLBACK_SECRET)

# Re-setter le secret :
supabase secrets set ML_CALLBACK_SECRET="nouveau-token"

# Puis redémarrer le worker
```

---

## 8️⃣ Optimisations Production

### Performance

```sql
-- Vaccum les tables régulièrement
VACUUM ANALYZE faces;
VACUUM ANALYZE face_persons;

-- Reindex si nécessaire
REINDEX INDEX idx_faces_embedding;
```

### Coûts

| Service | Coût Estimé (1000 photos/mois) |
|---------|--------------------------------|
| Render Starter (2GB) | $7/mois |
| Supabase Pro | $25/mois |
| Storage (images) | ~$0.02/GB |
| Edge Functions | Gratuit (jusqu'à 500k req) |
| **Total** | **~$32/mois** |

### Scale

- **<100 photos/jour** : 1 worker CPU suffit
- **100-500 photos/jour** : 2 workers + load balancer
- **>500 photos/jour** : worker GPU + autoscaling

---

## 9️⃣ Sécurité

### Checklist

- [ ] Service role key jamais exposé côté client
- [ ] ML_CALLBACK_SECRET fort (32+ chars)
- [ ] RLS policies activées sur toutes les tables
- [ ] CORS configuré proprement sur Edge Functions
- [ ] Signed URLs avec expiration courte (1h)
- [ ] Rate limiting sur les Edge Functions
- [ ] Logs des purges GDPR conservés

### Audit

```sql
-- Vérifier RLS activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('faces', 'face_persons', 'media_tags');
-- Tous doivent avoir rowsecurity = true

-- Lister les policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('faces', 'face_persons');
```

---

## 🎯 Checklist Finale

- [ ] Database schema déployé
- [ ] pgvector extension activée
- [ ] ML Worker déployé et healthy
- [ ] Edge Functions déployées
- [ ] Secrets configurés
- [ ] Frontend déployé
- [ ] Test création event OK
- [ ] Test upload + detect OK
- [ ] Test clustering OK
- [ ] Test assign user OK
- [ ] Test merge clusters OK
- [ ] Test GDPR purge OK
- [ ] Monitoring configuré
- [ ] Documentation équipe à jour

---

**🎉 Félicitations ! Le système de Face Clustering est déployé.**

Pour toute question, consulter :
- `infra/supabase/FACE_CLUSTERING_README.md` (architecture)
- `worker/README.md` (worker Python)
- Logs Worker + Edge Functions

