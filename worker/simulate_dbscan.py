"""
Simuler exactement DBSCAN pour comprendre pourquoi les clusters ne se forment pas
"""

import os
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv()

# Connexion à Supabase
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

EVENT_ID = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'

print("🔍 Simulation DBSCAN...\n")

# Récupérer toutes les faces
response = supabase.table('faces').select('id, media_id, embedding, face_person_id').eq('event_id', EVENT_ID).execute()
faces = response.data

# Convertir embeddings
embeddings = []
face_info = []
for face in faces:
    if face['embedding']:
        emb = face['embedding']
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings.append(emb)
        face_info.append({
            'id': face['id'][:8],
            'full_id': face['id'],
            'media_id': face['media_id'][:8],
            'current_cluster': face['face_person_id'][:8] if face['face_person_id'] else 'None'
        })

embeddings = np.array(embeddings)
distance_matrix = cosine_distances(embeddings)

print(f"📊 {len(embeddings)} faces à clustériser\n")

# Paramètres actuels
EPSILON = 0.55
MIN_SAMPLES = 2
MIN_CLUSTER_SIZE = 2

print(f"⚙️  Paramètres DBSCAN :")
print(f"  - eps = {EPSILON}")
print(f"  - min_samples = {MIN_SAMPLES}")
print(f"  - min_cluster_size (post-processing) = {MIN_CLUSTER_SIZE}\n")

# Lancer DBSCAN
clusterer = DBSCAN(eps=EPSILON, min_samples=MIN_SAMPLES, metric='precomputed')
labels = clusterer.fit_predict(distance_matrix)

# Analyser les résultats
unique_labels = set(labels)
n_clusters = len([l for l in unique_labels if l != -1])
n_noise = list(labels).count(-1)

print(f"🎯 Résultats DBSCAN bruts :")
print(f"  - Clusters trouvés : {n_clusters}")
print(f"  - Noise faces : {n_noise}\n")

# Détail par cluster
for label in unique_labels:
    if label == -1:
        continue
    
    cluster_indices = [i for i, l in enumerate(labels) if l == label]
    print(f"📦 Cluster {label} ({len(cluster_indices)} faces) :")
    
    for idx in cluster_indices:
        info = face_info[idx]
        print(f"  - Face {info['id']} (media: {info['media_id']}, current: {info['current_cluster']})")
    
    # Distances intra-cluster
    distances_in_cluster = []
    for i in range(len(cluster_indices)):
        for j in range(i+1, len(cluster_indices)):
            idx1, idx2 = cluster_indices[i], cluster_indices[j]
            dist = distance_matrix[idx1, idx2]
            distances_in_cluster.append(dist)
    
    if distances_in_cluster:
        print(f"  Distances intra-cluster :")
        print(f"    - Min: {min(distances_in_cluster):.4f}")
        print(f"    - Max: {max(distances_in_cluster):.4f}")
        print(f"    - Moyenne: {np.mean(distances_in_cluster):.4f}")
    print()

# Appliquer le filtre MIN_CLUSTER_SIZE
print(f"🔍 Après filtre MIN_CLUSTER_SIZE >= {MIN_CLUSTER_SIZE} :")
valid_clusters = 0
for label in unique_labels:
    if label == -1:
        continue
    cluster_size = list(labels).count(label)
    if cluster_size >= MIN_CLUSTER_SIZE:
        valid_clusters += 1
        print(f"  ✅ Cluster {label} gardé ({cluster_size} faces)")
    else:
        print(f"  ❌ Cluster {label} rejeté ({cluster_size} faces < {MIN_CLUSTER_SIZE})")

print(f"\n📊 TOTAL : {valid_clusters} clusters valides\n")

# Analyser les faces noise
noise_indices = [i for i, l in enumerate(labels) if l == -1]
if noise_indices:
    print(f"🔍 Analyse des {len(noise_indices)} faces noise :\n")
    
    # Trouver les paires de noise les plus proches
    noise_pairs = []
    for i in range(len(noise_indices)):
        for j in range(i+1, len(noise_indices)):
            idx1, idx2 = noise_indices[i], noise_indices[j]
            dist = distance_matrix[idx1, idx2]
            noise_pairs.append((idx1, idx2, dist))
    
    # Trier par distance
    noise_pairs.sort(key=lambda x: x[2])
    
    print("Top 5 paires de noise les plus similaires :")
    for idx1, idx2, dist in noise_pairs[:5]:
        info1 = face_info[idx1]
        info2 = face_info[idx2]
        print(f"  {info1['id']} ↔ {info2['id']} : {dist:.4f} ({'< eps' if dist < EPSILON else '> eps'})")
    
    print(f"\n💡 Pourquoi ces paires ne forment pas de cluster ?")
    print(f"   → DBSCAN nécessite min_samples={MIN_SAMPLES} voisins dans un rayon eps={EPSILON}")
    print(f"   → Si une face a < {MIN_SAMPLES} voisins proches, elle est marquée 'noise'")

