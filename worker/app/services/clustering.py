"""Face clustering using DBSCAN (from scikit-learn)"""

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from typing import List, Dict, Tuple, Any
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class ClusteringService:
    """DBSCAN-based face clustering"""
    
    def __init__(self):
        self.clusterer = None
    
    def cluster_faces(
        self,
        embeddings: np.ndarray,
        face_ids: List[str],
        quality_scores: List[float]
    ) -> Dict[int, List[Tuple[str, float]]]:
        """
        Cluster face embeddings using HDBSCAN
        
        Args:
            embeddings: numpy array of shape (n_faces, 512)
            face_ids: list of face IDs corresponding to embeddings
            quality_scores: list of quality scores for each face
        
        Returns:
            Dictionary mapping cluster_label -> [(face_id, quality_score), ...]
            cluster_label = -1 means noise (not assigned to any cluster)
        """
        if len(embeddings) == 0:
            logger.warning("No embeddings provided for clustering")
            return {}
        
        if len(embeddings) < settings.min_cluster_size:
            logger.warning(f"Too few faces ({len(embeddings)}) for clustering")
            # Return all as noise
            return {-1: [(face_ids[i], quality_scores[i]) for i in range(len(face_ids))]}
        
        try:
            logger.info(f"Clustering {len(embeddings)} faces...")
            
            # Calculate cosine distance matrix (DBSCAN needs a distance matrix)
            distance_matrix = cosine_distances(embeddings)
            
            # Initialize DBSCAN with precomputed distances
            # eps corresponds to cluster_epsilon (max distance between samples)
            # min_samples is the same parameter
            self.clusterer = DBSCAN(
                eps=settings.cluster_epsilon,
                min_samples=settings.min_samples,
                metric='precomputed'
            )
            
            # Fit and predict
            cluster_labels = self.clusterer.fit_predict(distance_matrix)
            
            # Group faces by cluster
            clusters: Dict[int, List[Tuple[str, float]]] = {}
            for idx, label in enumerate(cluster_labels):
                label = int(label)
                if label not in clusters:
                    clusters[label] = []
                clusters[label].append((face_ids[idx], quality_scores[idx]))
            
            # Log statistics
            n_clusters = len([k for k in clusters.keys() if k != -1])
            n_noise = len(clusters.get(-1, []))
            logger.info(f"Clustering complete: {n_clusters} clusters, {n_noise} noise faces")
            
            # Log cluster sizes
            for label, faces in clusters.items():
                if label != -1:
                    logger.debug(f"Cluster {label}: {len(faces)} faces")
            
            return clusters
            
        except Exception as e:
            logger.error(f"Error during clustering: {e}")
            raise
    
    def select_representative_face(
        self,
        cluster_faces: List[Tuple[str, float]]
    ) -> str:
        """
        Select the best representative face from a cluster
        
        Args:
            cluster_faces: list of (face_id, quality_score) tuples
        
        Returns:
            face_id of the representative face
        """
        if not cluster_faces:
            raise ValueError("Cannot select representative from empty cluster")
        
        # Select face with highest quality score
        representative = max(cluster_faces, key=lambda x: x[1])
        return representative[0]
    
    def compute_cluster_stats(
        self,
        cluster_faces: List[Tuple[str, float]]
    ) -> Dict[str, Any]:
        """
        Compute statistics for a cluster
        
        Args:
            cluster_faces: list of (face_id, quality_score) tuples
        
        Returns:
            Dictionary with cluster statistics
        """
        if not cluster_faces:
            return {
                'face_count': 0,
                'avg_quality': 0.0,
                'min_quality': 0.0,
                'max_quality': 0.0
            }
        
        quality_scores = [q for _, q in cluster_faces]
        
        return {
            'face_count': len(cluster_faces),
            'avg_quality': float(np.mean(quality_scores)),
            'min_quality': float(np.min(quality_scores)),
            'max_quality': float(np.max(quality_scores))
        }
    
    def compute_silhouette_score(self, embeddings: np.ndarray, labels: np.ndarray) -> float:
        """
        Compute silhouette score for clustering quality assessment
        
        Args:
            embeddings: face embeddings
            labels: cluster labels
        
        Returns:
            silhouette score [-1, 1], higher is better
        """
        try:
            from sklearn.metrics import silhouette_score
            
            # Filter out noise (-1)
            mask = labels != -1
            if np.sum(mask) < 2:
                return 0.0
            
            score = silhouette_score(
                embeddings[mask],
                labels[mask],
                metric='cosine'
            )
            return float(score)
        except Exception as e:
            logger.warning(f"Could not compute silhouette score: {e}")
            return 0.0


# Global instance
clustering_service = ClusteringService()

