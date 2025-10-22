# Memoria ML Worker

FastAPI-based ML worker for face detection and clustering using InsightFace + HDBSCAN.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Download InsightFace models (first time only, ~600MB)
python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l')"

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the server
uvicorn app.main:app --reload --port 8080
```

### Docker

```bash
# Build image
docker build -t memoria-ml-worker .

# Run container
docker run -p 8080:8080 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e CALLBACK_URL=your-callback-url \
  -e CALLBACK_SECRET=your-secret \
  memoria-ml-worker
```

## 📡 API Endpoints

### POST /process
Detect faces and generate embeddings for a single media item.

**Request:**
```json
{
  "job_id": "uuid",
  "media_id": "uuid",
  "event_id": "uuid",
  "media_url": "https://storage.supabase.co/signed-url..."
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "media_id": "uuid",
  "event_id": "uuid",
  "faces_detected": 3,
  "faces": [
    {
      "bbox": {"x": 0.2, "y": 0.3, "w": 0.15, "h": 0.2},
      "embedding": [0.123, 0.456, ...],  // 512-dimensional
      "quality_score": 0.98,
      "landmarks": {...}
    }
  ],
  "processing_time_seconds": 1.23,
  "status": "completed"
}
```

### POST /cluster
Cluster all faces in an event into person groups.

**Request:**
```json
{
  "job_id": "uuid",
  "event_id": "uuid"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "event_id": "uuid",
  "total_faces": 150,
  "clusters_created": 12,
  "noise_faces": 5,
  "clusters": [
    {
      "cluster_label": 0,
      "face_count": 25,
      "representative_face_id": "uuid",
      "avg_quality": 0.95
    }
  ],
  "processing_time_seconds": 2.45,
  "status": "completed"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "model_loaded": true,
  "gpu_available": false
}
```

## ⚙️ Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) | Required |
| `CALLBACK_URL` | Edge Function callback endpoint | Required |
| `CALLBACK_SECRET` | Secret for callback auth | Required |
| `DETECTION_THRESHOLD` | Min confidence for face detection | 0.5 |
| `DET_SIZE` | Detection resolution (640 or 320) | 640 |
| `MIN_CLUSTER_SIZE` | Min faces per cluster | 3 |
| `MIN_SAMPLES` | HDBSCAN min_samples | 2 |
| `CLUSTER_EPSILON` | Clustering threshold | 0.4 |
| `USE_GPU` | Enable GPU acceleration | false |

### GPU Support

To use GPU acceleration:

1. Install CUDA-compatible `onnxruntime-gpu`:
```bash
pip install onnxruntime-gpu==1.17.0
```

2. Set environment variable:
```bash
USE_GPU=true
CUDA_VISIBLE_DEVICES=0
```

3. Update Dockerfile:
```dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │ /process │  │ /cluster │  │/health││
│  └────┬─────┘  └────┬─────┘  └───────┘│
│       │             │                  │
│  ┌────▼─────────────▼────────────────┐ │
│  │         Services Layer           │ │
│  │  • FaceDetectorService           │ │
│  │  • ClusteringService             │ │
│  │  • SupabaseService               │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │             │
    ┌──────▼─┐    ┌──────▼────┐
    │ InsightFace│ │  HDBSCAN  │
    │ buffalo_l  │ │  Sklearn  │
    └───────────┘ └───────────┘
```

## 🔧 Performance Tuning

### CPU Optimization
- Reduce `DET_SIZE` to 320 for faster processing (lower accuracy)
- Use `workers=1` in uvicorn (model is not thread-safe)
- Increase `min_cluster_size` to reduce clustering time

### GPU Optimization
- Batch multiple images together
- Use `det_size=640` for better accuracy
- Monitor VRAM usage

### Expected Performance
- **Detection**: 5-10 images/sec (CPU), 30-50 img/sec (GPU)
- **Clustering**: <5s for 1000 faces
- **Cold start**: <10s (model loading)

## 🐳 Deployment

### Render

```bash
# Create new Web Service
# Docker deployment
# Environment: Set all required env vars
# Instance: 2GB RAM minimum
```

### Railway

```bash
railway up
railway variables set SUPABASE_URL=...
# Deploy from Dockerfile
```

### Google Cloud Run

```bash
gcloud run deploy memoria-ml-worker \
  --source . \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...
```

## 📊 Monitoring

### Logs
```bash
# Local
tail -f logs/worker.log

# Docker
docker logs -f container-id

# Cloud Run
gcloud run logs read memoria-ml-worker --limit 100
```

### Metrics to Track
- Requests per minute
- Average processing time
- Error rate
- Queue depth (pending jobs)
- Memory usage
- CPU/GPU utilization

## 🧪 Testing

```bash
# Test face detection
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-123",
    "media_id": "media-456",
    "event_id": "event-789",
    "media_url": "https://example.com/image.jpg"
  }'

# Health check
curl http://localhost:8080/health
```

## 🔒 Security

- Service role key stored securely (env vars only)
- Callback endpoint requires secret token
- Signed URLs for image downloads (expire after 1 hour)
- No images stored on disk (in-memory processing)
- Embeddings purged when event archived

## 🐛 Troubleshooting

### Model loading fails
```bash
# Manually download models
python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l'); app.prepare(ctx_id=0)"
```

### Out of memory
- Reduce `DET_SIZE` to 320
- Process images in smaller batches
- Increase container memory allocation

### Slow performance
- Enable GPU if available
- Check image resolution (resize large images before processing)
- Reduce `DETECTION_THRESHOLD` to skip low-quality detections

### Callback errors
- Verify `CALLBACK_URL` is reachable
- Check `CALLBACK_SECRET` matches Edge Function
- Monitor Edge Function logs

## 📚 Additional Resources

- [InsightFace Documentation](https://github.com/deepinsight/insightface)
- [HDBSCAN Documentation](https://hdbscan.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Python Client](https://supabase.com/docs/reference/python)

