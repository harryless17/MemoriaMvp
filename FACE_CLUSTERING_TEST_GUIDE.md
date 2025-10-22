# 🧪 Face Clustering - Guide de Test

## ✅ Pré-requis (FAIT)

- [x] Database : Tables créées
- [x] ML Worker : Running sur port 8080
- [x] Edge Functions : 4/4 déployées
- [x] Secret configuré

---

## 🎯 Test 1 : Créer un Event avec Face Recognition

### Via UI Web

1. **Aller sur** : `/events/new`
2. **Remplir** :
   - Titre : "Test Face Clustering"
   - Description : "Test du système ML"
   - Date : Aujourd'hui
3. **Activer le toggle** : "Activer la reconnaissance faciale" ✅
4. **Vérifier** : Le warning RGPD s'affiche
5. **Créer** l'événement

### Via SQL (Alternative)

```sql
INSERT INTO events (
  id, 
  owner_id, 
  title, 
  face_recognition_enabled,
  face_recognition_enabled_at,
  visibility,
  created_at
) VALUES (
  gen_random_uuid(),
  'ton-user-id',
  'Test Face Clustering',
  true,
  NOW(),
  'private',
  NOW()
) RETURNING id;
```

**Récupère l'ID de l'event** pour la suite.

---

## 🎯 Test 2 : Upload des Photos

### Préparer les photos

Télécharge 5-10 photos avec visages :
- Minimum 2-3 personnes différentes
- Chaque personne sur au moins 2 photos
- Visages clairs (pas de dos, pas trop floues)

### Upload via UI

1. Aller sur l'event créé
2. Upload les photos
3. Attendre que le upload soit terminé

**Récupère les `media_id`** (via SQL ou Network tab) :

```sql
SELECT id, storage_path 
FROM media 
WHERE event_id = 'ton-event-id';
```

---

## 🎯 Test 3 : Déclencher la Détection

### Option A : Via UI (quand implémenté)

1. Aller sur `/events/:id/analyse`
2. Cliquer "Start Clustering"

### Option B : Via Edge Function (maintenant)

```bash
# Récupère ton JWT
TOKEN="ton-user-jwt-token"
EVENT_ID="ton-event-id"

# Enqueue detection job
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/ml-enqueue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "detect",
    "event_id": "'$EVENT_ID'",
    "media_ids": ["media-id-1", "media-id-2"],
    "priority": "high"
  }'
```

### Option C : Via SQL direct (debug)

```sql
-- Créer un job manuellement
INSERT INTO ml_jobs (job_type, event_id, media_ids, status)
VALUES (
  'detect',
  'ton-event-id',
  ARRAY['media-id-1', 'media-id-2']::uuid[],
  'pending'
)
RETURNING id;
```

---

## 🎯 Test 4 : Vérifier le Processing

### Logs du Worker

```bash
# Voir les logs en temps réel
docker logs -f ml-worker

# Tu devrais voir :
# - "Processing media X for job Y"
# - "Detected N faces"
# - "Successfully processed..."
```

### Vérifier la Database

```sql
-- Status du job
SELECT id, job_type, status, result, error, created_at
FROM ml_jobs 
WHERE event_id = 'ton-event-id'
ORDER BY created_at DESC;

-- Faces détectés
SELECT 
  COUNT(*) as total_faces,
  AVG(quality_score) as avg_quality,
  COUNT(DISTINCT media_id) as media_with_faces
FROM faces 
WHERE event_id = 'ton-event-id';

-- Détail par media
SELECT 
  m.id,
  m.storage_path,
  COUNT(f.id) as faces_detected,
  AVG(f.quality_score) as avg_quality
FROM media m
LEFT JOIN faces f ON f.media_id = m.id
WHERE m.event_id = 'ton-event-id'
GROUP BY m.id, m.storage_path;
```

**Attendu** :
- Job status = `completed`
- X faces détectés (selon tes photos)
- Quality score > 0.5

---

## 🎯 Test 5 : Clustering

### Déclencher le Clustering

```bash
# Via Edge Function
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/ml-enqueue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cluster",
    "event_id": "'$EVENT_ID'",
    "priority": "high"
  }'

# OU via SQL
INSERT INTO ml_jobs (job_type, event_id, status)
VALUES ('cluster', 'ton-event-id', 'pending')
RETURNING id;
```

### Vérifier les Clusters

```sql
-- Clusters créés
SELECT 
  cluster_label,
  status,
  (metadata->>'face_count')::int as face_count,
  (metadata->>'avg_quality')::float as avg_quality
FROM face_persons
WHERE event_id = 'ton-event-id'
ORDER BY face_count DESC;

-- Avec détails user si linked
SELECT * FROM face_persons_with_stats
WHERE event_id = 'ton-event-id';
```

**Attendu** :
- 2-5 clusters créés (selon nombre de personnes)
- face_count ≥ 2 par cluster
- status = `pending`

---

## 🎯 Test 6 : Actions UI (via Edge Functions)

### A. Link User (Assigner à un membre)

```bash
FACE_PERSON_ID="cluster-id"
USER_ID="member-user-id"

curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-person-actions/link-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "face_person_id": "'$FACE_PERSON_ID'",
    "linked_user_id": "'$USER_ID'"
  }'
```

**Vérifier** :
```sql
-- Tags créés
SELECT COUNT(*), source 
FROM media_tags 
WHERE media_id IN (
  SELECT m.id FROM media m WHERE m.event_id = 'ton-event-id'
)
GROUP BY source;

-- Doit montrer des tags avec source='face_clustering'
```

### B. Invite by Email

```bash
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-person-actions/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "face_person_id": "'$FACE_PERSON_ID'",
    "email": "test@example.com",
    "message": "Tu es sur des photos !"
  }'
```

### C. Merge Clusters

```bash
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-person-actions/merge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_person_id": "cluster-1-id",
    "secondary_person_id": "cluster-2-id"
  }'
```

### D. Ignore Cluster

```bash
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-person-actions/ignore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "face_person_id": "'$FACE_PERSON_ID'"
  }'
```

### E. GDPR Purge

```bash
curl -X POST https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-person-actions/purge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "'$EVENT_ID'",
    "target_user_id": "'$USER_ID'"
  }'
```

---

## 🎯 Test 7 : Récupérer les Clusters (pour UI)

```bash
# GET face-persons
curl -X GET "https://vvxipiqffizembeyauwt.supabase.co/functions/v1/face-persons?event_id=$EVENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Réponse :
# {
#   "face_persons": [
#     {
#       "id": "...",
#       "cluster_label": 0,
#       "face_count": 5,
#       "avg_quality": 0.92,
#       "representative_face": {...},
#       "status": "pending"
#     }
#   ],
#   "total_clusters": 3,
#   "clustering_status": "completed"
# }
```

---

## ✅ Checklist de Test Complet

- [ ] Event créé avec `face_recognition_enabled=true`
- [ ] Photos uploadées (5-10 avec visages)
- [ ] Job `detect` lancé et completed
- [ ] Faces détectés dans la table `faces`
- [ ] Job `cluster` lancé et completed
- [ ] Clusters créés dans `face_persons`
- [ ] Action link-user → tags créés dans `media_tags`
- [ ] Action invite → email enregistré
- [ ] Action merge → clusters fusionnés
- [ ] Action purge → données supprimées
- [ ] Edge Function face-persons → données OK

---

## 🐛 Troubleshooting

### Worker ne traite pas les jobs

```bash
# Vérifier les logs
docker logs ml-worker

# Vérifier la config
docker exec ml-worker env | grep SUPABASE

# Redémarrer
docker restart ml-worker
```

### Jobs en failed

```sql
-- Voir l'erreur
SELECT id, job_type, error, attempts
FROM ml_jobs 
WHERE status = 'failed';
```

### Faces non détectés

- Vérifier quality des images (pas trop floues)
- Vérifier les visages sont de face (pas de profil)
- Regarder les logs worker pour les erreurs

### Clustering ne crée pas de clusters

- Minimum 10 faces requis
- Vérifier `MIN_CLUSTER_SIZE` dans worker .env
- Ajuster `CLUSTER_EPSILON` (0.3-0.5)

---

## 📊 Métriques de Succès

**Bon résultat** :
- ✅ ≥85% des visages clairs détectés
- ✅ 1 cluster = 1 personne (±10%)
- ✅ Quality score moyen >0.7
- ✅ Processing <5s par photo
- ✅ Clustering <10s pour 50 faces

---

## 🚀 Prochaines Étapes

Une fois les tests OK :
1. Implémenter l'UI Web (`/events/:id/analyse`)
2. Tester avec un vrai événement (50-100 photos)
3. Ajuster les paramètres ML si besoin
4. Déployer le worker en production (Render/Railway)

---

**📝 Notes** :
- Sauvegarder les `event_id` et `media_id` pour les tests
- Garder les logs worker pour debug
- Tester avec différents types de photos (groupe, portraits, etc.)

