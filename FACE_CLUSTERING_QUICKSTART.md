# ⚡ Face Clustering - Quick Start (Local Dev)

Guide rapide pour tester le système en local avant déploiement production.

---

## 🎯 Prérequis

- [x] Python 3.11+
- [x] Node.js 18+
- [x] Supabase CLI (`npm install -g supabase`)
- [x] Docker (optionnel, pour le worker)
- [x] Compte Supabase avec projet existant

---

## 🚀 Setup en 10 Minutes

### 1️⃣ Database Setup (2 min)

```bash
cd /home/aghiles/Bureau/MemoriaMvp

# Option A: Via Supabase CLI
supabase db push infra/supabase/face_clustering.sql

# Option B: Via Dashboard
# 1. Aller sur https://supabase.com/dashboard
# 2. SQL Editor
# 3. Copier-coller le contenu de infra/supabase/face_clustering.sql
# 4. Run
```

**Vérifier** :
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('ml_jobs', 'faces', 'face_persons', 'media_tags');
-- Doit retourner 4
```

---

### 2️⃣ Worker Setup (5 min)

#### Option A: Local (sans Docker)

```bash
cd worker

# Créer environnement virtuel
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# ou : venv\Scripts\activate  # Windows

# Installer dépendances
pip install -r requirements.txt

# Télécharger modèle InsightFace (première fois, ~600MB)
python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l')"

# Créer .env
cat > .env << EOF
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CALLBACK_URL=http://localhost:54321/functions/v1/ml-callback
CALLBACK_SECRET=dev-secret-token-12345
DETECTION_THRESHOLD=0.5
DET_SIZE=640
MIN_CLUSTER_SIZE=3
MIN_SAMPLES=2
CLUSTER_EPSILON=0.4
EOF

# Lancer le worker
uvicorn app.main:app --reload --port 8080
```

**Test** :
```bash
curl http://localhost:8080/health
# {"status":"healthy","version":"0.1.0","model_loaded":false,"gpu_available":false}
```

#### Option B: Docker

```bash
cd worker

# Build
docker build -t ml-worker .

# Run
docker run -p 8080:8080 \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e CALLBACK_URL=http://host.docker.internal:54321/functions/v1/ml-callback \
  -e CALLBACK_SECRET=dev-secret-token-12345 \
  ml-worker
```

---

### 3️⃣ Edge Functions Setup (3 min)

```bash
cd /home/aghiles/Bureau/MemoriaMvp

# Lancer Supabase local (optionnel)
supabase start

# OU utiliser votre projet cloud
supabase link --project-ref YOUR_PROJECT_REF

# Créer fichier secrets
cat > infra/supabase/functions/.env << EOF
ML_CALLBACK_SECRET=dev-secret-token-12345
EOF

# Déployer les fonctions
cd infra/supabase/functions
supabase functions deploy ml-enqueue
supabase functions deploy ml-callback
supabase functions deploy face-persons
supabase functions deploy face-person-actions

# Définir le secret
supabase secrets set ML_CALLBACK_SECRET=dev-secret-token-12345
```

---

## 🧪 Test Rapide End-to-End

### Étape 1: Créer un Event

```bash
# Via UI ou SQL direct
INSERT INTO events (id, name, created_by, face_recognition_enabled)
VALUES (
  gen_random_uuid(),
  'Test Event',
  'your-user-id',
  true
) RETURNING id;
```

### Étape 2: Upload des Photos de Test

Préparer 10-15 photos avec visages dans un dossier, puis :

```bash
# Via UI Web : /events/new → uploader
# OU via script
```

### Étape 3: Lancer la Détection

```bash
# Via UI : /events/:id/analyse → "Start Clustering"

# OU via curl
curl -X POST http://localhost:54321/functions/v1/ml-enqueue \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "detect",
    "event_id": "event-uuid",
    "media_ids": ["media-1", "media-2", "..."]
  }'
```

### Étape 4: Vérifier les Logs

**Worker** :
```bash
# Terminal où tourne uvicorn
# Doit afficher :
# Processing media xxx for job yyy
# Detected N faces
# Successfully processed media xxx: N faces in X.XXs
```

**Database** :
```sql
-- Vérifier le job
SELECT * FROM ml_jobs ORDER BY created_at DESC LIMIT 1;

-- Vérifier les faces détectés
SELECT COUNT(*), event_id FROM faces GROUP BY event_id;
```

### Étape 5: Clustering

Après que plusieurs photos sont traitées :

```bash
# Auto-trigger ou manuel
curl -X POST http://localhost:54321/functions/v1/ml-enqueue \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cluster",
    "event_id": "event-uuid"
  }'
```

### Étape 6: Vérifier les Clusters

```sql
SELECT 
  cluster_label,
  status,
  metadata->>'face_count' as face_count
FROM face_persons
WHERE event_id = 'your-event-id';
```

### Étape 7: Tester l'UI

```bash
cd apps/web
npm run dev

# Aller sur http://localhost:3000/events/YOUR_EVENT_ID/analyse
# Vérifier :
# - Grille de clusters s'affiche
# - Actions Assign/Invite/Merge fonctionnent
```

---

## 🐛 Troubleshooting Quick

### ❌ Worker : "Failed to load image"

**Cause** : URL signée expirée ou inaccessible

**Fix** :
```sql
-- Générer une nouvelle URL signée
SELECT storage.sign_url('media', media.url, 3600)
FROM media WHERE id = 'media-id';
```

### ❌ Edge Function : 401 Unauthorized

**Cause** : JWT invalide ou expiré

**Fix** :
```bash
# Récupérer un nouveau token
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","password":"password"}'
```

### ❌ Clustering : "Too few faces"

**Cause** : Moins de 10 faces détectés dans l'event

**Fix** :
- Uploader plus de photos avec visages
- OU réduire `MIN_FACES_FOR_CLUSTERING` dans ml-callback

### ❌ Worker : Out of Memory

**Cause** : Photos trop grandes ou RAM insuffisante

**Fix** :
```python
# Dans face_detector.py, ajouter un resize
image = cv2.resize(image, (max_width, max_height))
```

---

## 📊 Commandes Utiles

### Monitoring Database

```sql
-- Jobs en cours
SELECT job_type, status, COUNT(*) 
FROM ml_jobs 
GROUP BY job_type, status;

-- Dernières erreurs
SELECT id, error, created_at 
FROM ml_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 5;

-- Stats event
SELECT 
  e.name,
  COUNT(DISTINCT m.id) as total_media,
  COUNT(DISTINCT f.id) as faces_detected,
  COUNT(DISTINCT fp.id) as clusters_created
FROM events e
LEFT JOIN media m ON m.event_id = e.id
LEFT JOIN faces f ON f.media_id = m.id
LEFT JOIN face_persons fp ON fp.event_id = e.id
WHERE e.face_recognition_enabled = true
GROUP BY e.id, e.name;
```

### Reset Event (pour re-tester)

```sql
-- Supprimer toutes les données ML d'un event
DELETE FROM media_tags 
WHERE media_id IN (SELECT id FROM media WHERE event_id = 'event-id');

DELETE FROM face_persons WHERE event_id = 'event-id';
DELETE FROM faces WHERE event_id = 'event-id';
DELETE FROM ml_jobs WHERE event_id = 'event-id';
```

### Logs Edge Functions

```bash
# Via CLI
supabase functions logs ml-callback --limit 50

# Ou Dashboard : Edge Functions → Logs
```

---

## 🎯 Checklist Validation Locale

Avant de déployer en prod, vérifier :

- [ ] Worker démarre sans erreur
- [ ] Health check `/health` retourne 200
- [ ] Job `detect` se termine avec status `completed`
- [ ] Faces insérés dans DB avec embeddings
- [ ] Job `cluster` crée des face_persons
- [ ] UI `/analyse` affiche les clusters
- [ ] Action "Assign" crée des media_tags
- [ ] Action "Merge" fusionne correctement
- [ ] Purge GDPR supprime les données
- [ ] Pas d'erreurs dans les logs

---

## 🚀 Prêt pour la Prod ?

Une fois tous les tests locaux OK :

1. Suivre `FACE_CLUSTERING_DEPLOYMENT.md`
2. Déployer Worker sur Render/Railway
3. Déployer Edge Functions
4. Mettre à jour les env vars avec les vraies URLs
5. Exécuter les tests d'acceptation (`FACE_CLUSTERING_TESTS.md`)

---

**🎉 Bon test !**

Questions ? Consulter les autres docs :
- Architecture : `infra/supabase/FACE_CLUSTERING_README.md`
- Déploiement : `FACE_CLUSTERING_DEPLOYMENT.md`
- Tests : `FACE_CLUSTERING_TESTS.md`

