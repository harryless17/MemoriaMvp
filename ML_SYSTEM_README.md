# 🤖 ML System - Face Clustering & Tagging

## 📋 Architecture

Le système de clustering de visages est composé de 3 parties :

1. **ML Worker** (Docker) : Détection et clustering des visages
2. **Job Poller** (Script Bash) : Traite automatiquement les jobs pending
3. **Edge Functions** (Supabase) : API sécurisée pour créer des jobs

## 🚀 Démarrage

### Démarrage complet (recommandé)

```bash
./start_all.sh
```

Cela démarre :
- ✅ ML Worker (Docker)
- ✅ Job Poller (Background)
- ✅ Web Frontend (Next.js)

### Arrêt complet

```bash
./stop_all.sh
```

### Démarrage manuel

Si tu préfères démarrer les services séparément :

```bash
# 1. ML Worker
docker-compose up -d ml-worker

# 2. Job Poller
./simple_poller.sh &

# 3. Web Frontend
cd apps/web && pnpm dev
```

## 📊 Workflow

1. **Upload photos** → Via l'interface web
2. **Page /analyse** → Clique sur "Refresh & Check New Photos"
3. **Edge Function** → Crée un job `cluster` dans la DB
4. **Job Poller** → Détecte le job et appelle le worker
5. **ML Worker** → Détecte les faces + Clustering intelligent
6. **Frontend** → Affiche les résultats

## 🔍 Monitoring

### Vérifier les logs

```bash
# ML Worker
docker-compose logs -f ml-worker

# Job Poller
tail -f poller.log

# Web Frontend
tail -f web.log
```

### Vérifier la santé du worker

```bash
curl http://localhost:8080/health
```

### Vérifier les jobs pending

```bash
# Depuis le worker directory
cd worker
source .env
curl -s "${SUPABASE_URL}/rest/v1/ml_jobs?status=eq.pending" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq '.'
```

## 🛠️ Troubleshooting

### Le worker ne démarre pas

```bash
# Vérifier Docker
docker ps

# Rebuild l'image
docker-compose build ml-worker
docker-compose up -d ml-worker
```

### Les jobs restent en pending

```bash
# Vérifier que le poller tourne
ps aux | grep simple_poller

# Redémarrer le poller
pkill -f simple_poller
./simple_poller.sh &
```

### Le clustering ne fonctionne pas

```bash
# Tester manuellement
curl -X POST http://localhost:8080/cluster \
  -H "Content-Type: application/json" \
  -d '{"job_id": "JOB_ID_HERE", "event_id": "EVENT_ID_HERE"}'
```

## 📝 Configuration

### Variables d'environnement (worker/.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_URL=http://localhost:8080
```

### Paramètres du poller

Modifier `simple_poller.sh` :

```bash
POLL_INTERVAL=10  # Intervalle en secondes (défaut: 10s)
```

## 🎯 Clustering Intelligent

Le système préserve automatiquement :
- ✅ Clusters déjà assignés (`status='linked'`)
- ✅ Clusters en attente (`status='pending'`)
- ✅ Tags existants (pas de duplication)

Seuls les clusters `ignored` sont supprimés lors du re-clustering.

## 📚 API Endpoints

### ML Worker

- `GET /health` : Santé du worker
- `POST /process` : Détection de visages (1 photo)
- `POST /cluster` : Clustering d'un event

### Edge Functions

- `POST /ml-enqueue` : Créer un job de clustering
- `GET /face-persons` : Récupérer les clusters
- `POST /face-person-actions` : Actions sur les clusters (assign, merge, etc.)

## 🔐 Sécurité

- ✅ RLS activé sur toutes les tables
- ✅ Service Role Key pour le worker
- ✅ Auth JWT pour les Edge Functions
- ✅ Signed URLs pour les médias

## 📈 Performance

- **Détection** : ~1-2s par photo
- **Clustering** : ~2-3s pour 10 photos
- **Seuil de similarité** : 0.6 (cosine similarity)
- **Min cluster size** : 2 faces

## 🚧 Limitations actuelles

- Pas de GPU support (CPU only)
- Pas de queue Redis (polling simple)
- Pas de retry automatique sur erreur
- Pas de scaling horizontal

## 🔮 Améliorations futures

- [ ] Redis queue pour meilleure performance
- [ ] GPU support pour détection plus rapide
- [ ] Retry automatique avec backoff
- [ ] Webhooks au lieu de polling
- [ ] Métriques et monitoring (Prometheus)
- [ ] Support multi-worker (scaling)
