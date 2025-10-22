"""
Simuler DBSCAN sur SEULEMENT les faces non assignées (comme le fait le worker)
"""

import os
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

EVENT_ID = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'

print("🔍 Simulation DBSCAN sur SEULEMENT les faces non assignées...\n")

# Récupérer toutes les faces
response = supabase.table('faces').select('id, media_id, embedding, face_person_id').eq('event_id', EVENT_ID).execute()
faces = response.data

# Séparer assignées vs non assignées
assigned = [f for f in faces if f['face_person_id'] is not None]
unassigned = [f for f in faces if f['face_person_id'] is None]

print(f"📊 Total : {len(faces)} faces")
print(f"  - Assignées : {len(assigned)}")
print(f"  - Non assignées : {len(unassigned)}\n")

# Convertir embeddings des faces NON ASSIGNÉES seulement
embeddings = []
face_info = []
for face in unassigned:
    if face['embedding']:
        emb = face['embedding']
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings.append(emb)
        face_info.append({
            'id': face['id'][:8],
            'media_id': face['media_id'][:8]
        })

embeddings = np.array(embeddings)
distance_matrix = cosine_distances(embeddings)

print(f"📐 Clustering {len(embeddings)} faces non assignées...\n")

# Paramètres
EPSILON = 0.55
MIN_SAMPLES = 2
MIN_CLUSTER_SIZE = 2

print(f"⚙️  Paramètres :")
print(f"  - eps = {EPSILON}")
print(f"  - min_samples = {MIN_SAMPLES}")
print(f"  - min_cluster_size = {MIN_CLUSTER_SIZE}\n")

# DBSCAN
clusterer = DBSCAN(eps=EPSILON, min_samples=MIN_SAMPLES, metric='precomputed')
labels = clusterer.fit_predict(distance_matrix)

# Résultats
unique_labels = set(labels)
n_clusters = len([l for l in unique_labels if l != -1])
n_noise = list(labels).count(-1)

print(f"🎯 Résultats DBSCAN :")
print(f"  - Clusters trouvés : {n_clusters}")
print(f"  - Noise faces : {n_noise}\n")

# Détail
for label in unique_labels:
    if label == -1:
        continue
    
    cluster_indices = [i for i, l in enumerate(labels) if l == label]
    cluster_size = len(cluster_indices)
    
    print(f"📦 Cluster {label} ({cluster_size} faces) :")
    for idx in cluster_indices:
        info = face_info[idx]
        print(f"  - Face {info['id']} (media: {info['media_id']})")
    
    # Distances intra-cluster
    distances = []
    for i in range(len(cluster_indices)):
        for j in range(i+1, len(cluster_indices)):
            idx1, idx2 = cluster_indices[i], cluster_indices[j]
            distances.append(distance_matrix[idx1, idx2])
    
    if distances:
        print(f"  Distances : min={min(distances):.4f}, max={max(distances):.4f}, avg={np.mean(distances):.4f}")
    
    if cluster_size >= MIN_CLUSTER_SIZE:
        print(f"  ✅ Cluster VALIDE (>= {MIN_CLUSTER_SIZE})")
    else:
        print(f"  ❌ Cluster REJETÉ (< {MIN_CLUSTER_SIZE})")
    print()

print(f"\n💡 CONCLUSION :")
valid = len([l for l in unique_labels if l != -1 and list(labels).count(l) >= MIN_CLUSTER_SIZE])
print(f"  → {valid} nouveaux clusters seront créés en base")
print(f"  → {n_noise} faces resteront non assignées")

