"""
Script pour analyser les distances entre les embeddings de visages
et comprendre pourquoi le clustering ne fonctionne pas
"""

import os
import numpy as np
from sklearn.metrics.pairwise import cosine_distances
from supabase import create_client
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Connexion à Supabase
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# ID de l'événement (à adapter)
EVENT_ID = 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef'

print("🔍 Analyse des distances entre les faces...\n")

# Récupérer toutes les faces de l'événement
response = supabase.table('faces').select('id, media_id, embedding, face_person_id, created_at').eq('event_id', EVENT_ID).execute()
faces = response.data

print(f"📊 Total de {len(faces)} faces détectées\n")

# Séparer les faces en groupes
assigned_faces = [f for f in faces if f['face_person_id'] is not None]
unassigned_faces = [f for f in faces if f['face_person_id'] is None]

print(f"✅ {len(assigned_faces)} faces assignées à des clusters")
print(f"❌ {len(unassigned_faces)} faces non assignées (noise)\n")

if len(faces) < 2:
    print("❌ Pas assez de faces pour analyser")
    exit(0)

# Convertir les embeddings en numpy array
import json
embeddings = []
face_ids = []
for face in faces:
    if face['embedding']:
        # Si c'est une string JSON, la parser
        emb = face['embedding']
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings.append(emb)
        face_ids.append(face['id'][:8])

embeddings = np.array(embeddings)

print(f"📐 Calcul de la matrice des distances (cosine)...\n")

# Calculer la matrice des distances
distance_matrix = cosine_distances(embeddings)

# Analyser les distances
print("📊 Statistiques des distances :")
print(f"  - Distance minimum : {distance_matrix[distance_matrix > 0].min():.4f}")
print(f"  - Distance maximum : {distance_matrix.max():.4f}")
print(f"  - Distance moyenne : {distance_matrix[distance_matrix > 0].mean():.4f}")
print(f"  - Distance médiane : {np.median(distance_matrix[distance_matrix > 0]):.4f}\n")

# Trouver les paires les plus similaires
print("🔥 Top 10 paires les plus similaires (distance la plus faible) :")
for i in range(len(embeddings)):
    for j in range(i+1, len(embeddings)):
        dist = distance_matrix[i, j]
        if dist > 0:  # Éviter les distances nulles (même face)
            print(f"  Face {face_ids[i]} ↔ Face {face_ids[j]} : distance = {dist:.4f}")
        if i * len(embeddings) + j >= 10:
            break
    if i * len(embeddings) >= 10:
        break

print("\n⚙️  Paramètres de clustering :")
print(f"  - CLUSTER_EPSILON actuel : 0.55")
print(f"  - MIN_CLUSTER_SIZE actuel : 3")
print(f"  - MIN_SAMPLES actuel : 2\n")

# Compter combien de paires ont une distance < 0.55
threshold = 0.55
similar_pairs = np.sum(distance_matrix < threshold) // 2  # Diviser par 2 car la matrice est symétrique
total_pairs = (len(embeddings) * (len(embeddings) - 1)) // 2

print(f"📈 Avec CLUSTER_EPSILON = {threshold} :")
print(f"  - {similar_pairs}/{total_pairs} paires sont similaires ({100*similar_pairs/total_pairs:.1f}%)\n")

# Suggérer un nouveau seuil
# Trouver le seuil qui regrouperait au moins 50% des paires
distances_sorted = np.sort(distance_matrix[distance_matrix > 0])
median_dist = distances_sorted[len(distances_sorted) // 2]
percentile_75 = distances_sorted[int(len(distances_sorted) * 0.75)]

print(f"💡 Suggestions :")
print(f"  - Pour regrouper 50% des paires : CLUSTER_EPSILON = {median_dist:.4f}")
print(f"  - Pour regrouper 75% des paires : CLUSTER_EPSILON = {percentile_75:.4f}")
print(f"  - OU baisser MIN_CLUSTER_SIZE de 3 à 2")

