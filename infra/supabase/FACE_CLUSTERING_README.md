# Face Clustering & Tagging System

## 📋 Overview

Système de reconnaissance faciale assistée par ML pour taguer automatiquement les personnes sur les photos d'événements.

**Pipeline :** Upload → Detect Faces → Cluster by Person → Human Review → Auto-Tag

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                   │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────┐            │
│  │  ml_jobs   │  │face_persons  │  │  faces  │            │
│  │  (queue)   │  │  (clusters)  │  │(embeddings)          │
│  └─────┬──────┘  └──────┬───────┘  └────┬────┘            │
│        │                 │                │                  │
└────────┼─────────────────┼────────────────┼─────────────────┘
         │                 │                │
    ┌────▼─────────────────▼────────────────▼─────┐
    │     Edge Functions (Deno/TypeScript)        │
    │  • POST /ml/enqueue                          │
    │  • POST /ml/callback (secured)               │
    │  • GET  /event/:id/face-persons              │
    │  • POST /person/:id/link-user                │
    │  • POST /person/:id/invite                   │
    │  • POST /person/:id/merge                    │
    │  • POST /privacy/purge                       │
    └────────┬──────────────▲────────────────────┘
             │              │
             │ signed URL   │ webhook
             │              │
    ┌────────▼──────────────┴────────────────────┐
    │   ML Worker (Python FastAPI)               │
    │   • InsightFace (buffalo_l)                │
    │   • ONNXRuntime                            │
    │   • POST /process (detect + embed)         │
    │   • POST /cluster (HDBSCAN)                │
    └────────────────────────────────────────────┘
         │
         │ deployed on
         ▼
    Render / Railway / Cloud Run
```

## 📊 Database Schema

### 1. `ml_jobs` - Job Queue
File d'attente pour les tâches ML asynchrones.

```sql
{
  id: uuid,
  job_type: 'detect' | 'cluster',
  event_id: uuid,
  media_ids: uuid[],  -- pour batch processing
  status: 'pending' | 'processing' | 'completed' | 'failed',
  priority: 'high' | 'normal' | 'low',
  attempts: int,
  error: text,
  result: jsonb
}
```

**Index optimisés pour polling efficace de la queue.**

### 2. `faces` - Detected Faces
Un visage détecté = une ligne. Contient l'embedding vectoriel.

```sql
{
  id: uuid,
  media_id: uuid,
  event_id: uuid,
  face_person_id: uuid?,  -- assigned après clustering
  bbox: { x, y, w, h },   -- normalized [0-1]
  embedding: vector(512),  -- InsightFace buffalo_l
  quality_score: float,    -- confidence [0-1]
  landmarks: jsonb?        -- optionnel: yeux, nez, bouche
}
```

**Index vector (ivfflat) pour recherche par similarité cosinus.**

### 3. `face_persons` - Clusters
Un cluster = une personne détectée dans l'événement.

```sql
{
  id: uuid,
  event_id: uuid,
  cluster_label: int,              -- sortie HDBSCAN
  representative_face_id: uuid,    -- meilleure photo pour thumbnail
  linked_user_id: uuid?,           -- associé à un compte
  status: 'pending' | 'linked' | 'invited' | 'ignored' | 'merged',
  invitation_email: text?,
  merged_into_id: uuid?,           -- si fusionné avec un autre cluster
  metadata: {
    face_count: int,
    avg_quality: float,
    manual_edits: int
  }
}
```

### 4. `media_tags` - Final Tags
Résultat final visible par tous. Créé après validation humaine.

```sql
{
  id: uuid,
  media_id: uuid,
  tagged_user_id: uuid,
  tagged_by_user_id: uuid,  -- qui a créé le tag
  source: 'manual' | 'face_clustering' | 'imported' | 'suggested',
  bbox: jsonb?,             -- position dans l'image
  face_id: uuid?            -- lien vers le face original
}
```

**UNIQUE(media_id, tagged_user_id)** : un user = 1 tag max par media.

## 🔄 Flow Détaillé

### Phase 1 : Detection (par photo)

```
1. User uploads photos via /upload
   ↓
2. Supabase trigger/cron détecte nouveaux media sans faces
   ↓
3. Edge Function /ml/enqueue crée ml_job(type='detect')
   ↓
4. Worker Python poll la queue (ou webhook)
   ↓
5. Worker télécharge l'image via signed URL
   ↓
6. InsightFace détecte visages → génère embeddings
   ↓
7. Worker écrit dans table faces
   ↓
8. Worker callback → Edge Function /ml/callback
   ↓
9. Met à jour ml_job.status = 'completed'
```

### Phase 2 : Clustering (par événement)

```
10. Après X photos détectées, déclenche ml_job(type='cluster')
    ↓
11. Worker récupère tous les faces.embedding de l'event
    ↓
12. HDBSCAN cluster avec metric='cosine'
    ↓
13. Pour chaque cluster :
    - Crée face_persons
    - Assigne representative_face_id (meilleur quality_score)
    - Met à jour faces.face_person_id
    ↓
14. Callback → notif au créateur "Clustering terminé"
```

### Phase 3 : Human Review (UI)

```
15. Créateur ouvre /events/:id/analyse
    ↓
16. Affiche grille : 1 vignette par face_person
    ↓
17. Actions possibles :
    - Assigner à un membre existant
    - Inviter par email (magic link)
    - Fusionner 2 clusters
    - Ignorer (faux positif)
    ↓
18. Clic "Assigner" → POST /person/:id/link-user
    ↓
19. Backend crée media_tags en masse pour tous les faces du cluster
```

## 🔐 RGPD Compliance

### Consentement
- Toggle `face_recognition_enabled` dans création d'event
- Texte explicite : "J'autorise l'analyse automatique des visages"
- Lien vers politique de confidentialité

### Stockage limité
- Embeddings supprimés quand event archivé/supprimé
- Trigger automatique `cleanup_face_embeddings_on_event_archive()`
- Conservation des stats anonymes (face_count) pour analytics

### Droit à l'effacement
```sql
SELECT purge_face_data_for_user('user-uuid', 'event-uuid');
-- Supprime : faces, face_persons, media_tags liés
```

### Validation humaine
- Aucun tag créé automatiquement
- Toujours une confirmation par l'organisateur
- Source tracée dans media_tags.source

## 🎨 UI Components (à créer)

### 1. `/events/:id/analyse` (Web + Mobile)
- Grille responsive de clusters
- Card par face_person :
  - Thumbnail (representative face)
  - Badge : "X photos"
  - Status badge (pending/linked/ignored)
  - Actions : Assign / Invite / Ignore

### 2. Modal "Assign to Member"
- Autocomplete : cherche parmi event_members
- Bouton "Invite someone else" → bascule vers modal Invite
- Preview : montre 3-5 photos du cluster

### 3. Modal "Invite by Email"
- Input email
- Message perso optionnel
- Envoie magic link + preview des photos

### 4. Modal "Merge Clusters"
- Multi-select de face_persons
- Preview des 2 clusters côte à côte
- Validation

### 5. Progress Indicator
- "Analyse en cours : 45/120 photos traitées"
- "15 personnes détectées, 3 déjà identifiées"

## ⚙️ Configuration ML Worker

### InsightFace Buffalo_L
```python
FaceAnalysis(
    name='buffalo_l',
    providers=['CPUExecutionProvider'],  # ou CUDA si GPU
    det_size=(640, 640),  # résolution détection
    det_thresh=0.5        # seuil confiance
)
```

### HDBSCAN Clustering
```python
HDBSCAN(
    min_cluster_size=3,    # min 3 photos pour un cluster
    min_samples=2,
    metric='cosine',
    cluster_selection_epsilon=0.4  # seuil similarité
)
```

**Tuning :**
- `min_cluster_size` ↑ = moins de faux clusters, mais personnes rares ignorées
- `cluster_selection_epsilon` ↓ = plus strict (même personne), risque de split

### Performance Targets
- **Détection** : 5-10 images/sec (CPU), 30-50 img/sec (GPU)
- **Clustering** : <5s pour 1000 faces
- **Cold start** : <10s (warm model en RAM)

## 🧪 Tests d'Acceptation

### Test 1 : Event de 60 photos
```
- 40 photos avec visages clairs
- 10 photos de groupe (multi-faces)
- 10 photos sans visages (paysages)

Résultats attendus :
✅ ≥35 visages détectés (87%)
✅ ≤8 clusters (personnes distinctes)
✅ ≤5% faux positifs (statues, reflets)
✅ Temps total <2min
```

### Test 2 : Fusion de clusters
```
- Détecter intentionnellement 2 clusters pour 1 personne
- Fusionner via UI
- Vérifier : tous les faces réassignés, tags corrects
```

### Test 3 : RGPD Purge
```
- Créer event avec faces détectés + tags
- Appeler purge_face_data_for_user()
- Vérifier : 0 embeddings, 0 tags, metadata stats OK
```

## 📈 Metrics & Monitoring

### Métriques clés
```sql
-- Jobs en attente
SELECT COUNT(*) FROM ml_jobs WHERE status = 'pending';

-- Taux d'échec
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*)
FROM ml_jobs;

-- Temps moyen processing
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
FROM ml_jobs WHERE status = 'completed';

-- Coverage : % photos avec faces détectés
SELECT 
  e.id,
  e.name,
  COUNT(DISTINCT m.id) as total_media,
  COUNT(DISTINCT f.media_id) as media_with_faces,
  COUNT(DISTINCT f.media_id) * 100.0 / COUNT(DISTINCT m.id) as coverage_pct
FROM events e
LEFT JOIN media m ON m.event_id = e.id
LEFT JOIN faces f ON f.media_id = m.id
WHERE e.face_recognition_enabled = true
GROUP BY e.id;
```

### Logs importants
- Worker : temps détection, nb faces/image, erreurs modèle
- Clustering : nb clusters, silhouette score, noise ratio
- Edge Functions : latence callbacks, échecs auth

## 🚀 Déploiement

### 1. Supabase Migration
```bash
psql $DATABASE_URL < infra/supabase/face_clustering.sql
```

### 2. Worker Deployment (voir worker/README.md)
```bash
# Render / Railway
# Set env vars : SUPABASE_URL, SUPABASE_SERVICE_KEY, CALLBACK_URL, CALLBACK_SECRET

# Cloud Run
gcloud run deploy ml-worker \
  --source . \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2
```

### 3. Edge Functions
```bash
supabase functions deploy ml-enqueue
supabase functions deploy ml-callback
# ... etc
```

## 🔮 Roadmap Future

### V2 - Intelligence améliorée
- **Active learning** : réentraînement avec corrections manuelles
- **Cross-event recognition** : "Cette personne ressemble à @alice (event précédent)"
- **Smart suggestions** : "Voulez-vous tagger aussi ces 3 photos similaires ?"

### V3 - Features avancées
- **Search by face** : upload une photo → trouve cette personne dans tous les events
- **Privacy zones** : blur automatique de certains visages (enfants, VIPs)
- **Age/emotion detection** : metadata enrichi (optionnel)

### V4 - Scale
- **GPU workers** pour événements >500 photos
- **Streaming processing** : temps réel pendant upload
- **Distributed clustering** : Spark/Dask pour events >10k photos

---

**Questions ?** Consulter `worker/README.md` pour le setup du worker Python.

