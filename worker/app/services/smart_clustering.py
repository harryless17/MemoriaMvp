"""Smart clustering service that preserves existing assignments"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
import logging
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class SmartClusteringService:
    """Intelligent clustering that preserves existing face_person assignments"""
    
    def __init__(self, similarity_threshold: float = 0.6):
        """
        Args:
            similarity_threshold: Minimum cosine similarity to assign face to existing cluster
        """
        self.similarity_threshold = similarity_threshold
    
    async def assign_faces_to_existing_clusters(
        self,
        faces_data: List[Dict[str, Any]],
        existing_clusters: List[Dict[str, Any]],
        get_embedding_func
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Assign new faces to existing clusters based on similarity
        
        Args:
            faces_data: List of face data with embeddings
            existing_clusters: List of existing face_persons
            get_embedding_func: Async function to get embedding for a face_id
            
        Returns:
            Tuple of (assigned_faces, unassigned_faces)
        """
        assigned = []
        unassigned = []
        
        if not existing_clusters:
            # No existing clusters, all faces are unassigned
            return [], faces_data
        
        logger.info(f"Assigning {len(faces_data)} faces to {len(existing_clusters)} existing clusters...")
        
        # Get representative embeddings for each existing cluster
        cluster_embeddings = {}
        for cluster in existing_clusters:
            rep_face_id = cluster.get('representative_face_id')
            if rep_face_id:
                embedding = await get_embedding_func(rep_face_id)
                if embedding:
                    cluster_embeddings[cluster['id']] = np.array(embedding, dtype=np.float32)
        
        if not cluster_embeddings:
            logger.warning("No cluster embeddings found, all faces will be unassigned")
            return [], faces_data
        
        # Convert to arrays for vectorized operations
        cluster_ids = list(cluster_embeddings.keys())
        cluster_emb_matrix = np.array([cluster_embeddings[cid] for cid in cluster_ids], dtype=np.float32)
        
        # Assign each face
        for face in faces_data:
            if face.get('face_person_id'):
                # Already assigned, skip
                continue
            
            face_embedding = np.array(face['embedding'], dtype=np.float32).reshape(1, -1)
            
            # Compute similarities to all clusters
            similarities = cosine_similarity(face_embedding, cluster_emb_matrix)[0]
            
            # Find best match
            max_sim_idx = np.argmax(similarities)
            max_similarity = similarities[max_sim_idx]
            
            if max_similarity >= self.similarity_threshold:
                # Assign to existing cluster
                matched_cluster_id = cluster_ids[max_sim_idx]
                assigned.append({
                    'face_id': face['id'],
                    'face_person_id': matched_cluster_id,
                    'similarity': float(max_similarity)
                })
                logger.debug(f"Face {face['id'][:8]} assigned to cluster {matched_cluster_id[:8]} (sim: {max_similarity:.3f})")
            else:
                # No good match, add to unassigned
                unassigned.append(face)
                logger.debug(f"Face {face['id'][:8]} unassigned (max sim: {max_similarity:.3f})")
        
        logger.info(f"Assigned {len(assigned)} faces, {len(unassigned)} remain unassigned")
        return assigned, unassigned
    
    def should_preserve_cluster(self, cluster: Dict[str, Any]) -> bool:
        """
        Determine if a cluster should be preserved (not deleted/recreated)
        
        Args:
            cluster: face_person data
            
        Returns:
            True if cluster should be preserved
        """
        # Always preserve 'linked' clusters (user has assigned them)
        if cluster.get('status') == 'linked':
            return True
        
        # Also preserve 'pending' clusters to avoid recreation
        if cluster.get('status') == 'pending':
            return True
        
        # Could add other criteria here (e.g., high confidence, manually verified, etc.)
        return False
    
    def filter_preserved_and_deletable(
        self,
        existing_clusters: List[Dict[str, Any]]
    ) -> Tuple[List[Dict], List[str]]:
        """
        Split existing clusters into those to preserve and those to delete
        
        Returns:
            Tuple of (clusters_to_preserve, cluster_ids_to_delete)
        """
        preserve = []
        delete_ids = []
        
        for cluster in existing_clusters:
            if self.should_preserve_cluster(cluster):
                preserve.append(cluster)
                logger.info(f"Preserving cluster {cluster['id'][:8]} (status: {cluster.get('status')})")
            else:
                delete_ids.append(cluster['id'])
                logger.info(f"Marking cluster {cluster['id'][:8]} for deletion (status: {cluster.get('status')})")
        
        return preserve, delete_ids

