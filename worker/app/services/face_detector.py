"""Face detection and embedding using InsightFace"""

import numpy as np
import cv2
from insightface.app import FaceAnalysis
from typing import List, Tuple, Optional
import logging
from app.config import settings
from app.models import DetectedFace, BoundingBox, Landmarks

logger = logging.getLogger(__name__)


class FaceDetectorService:
    """InsightFace-based face detection and embedding"""
    
    def __init__(self):
        self.app: Optional[FaceAnalysis] = None
        self._initialized = False
    
    def initialize(self):
        """Lazy initialization of InsightFace model"""
        if self._initialized:
            return
        
        try:
            logger.info("Loading InsightFace buffalo_l model...")
            
            # Determine providers (GPU or CPU)
            if settings.use_gpu:
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
                logger.info("GPU mode enabled")
            else:
                providers = ['CPUExecutionProvider']
                logger.info("CPU mode enabled")
            
            self.app = FaceAnalysis(
                name='buffalo_l',
                providers=providers
            )
            
            # Prepare model with detection size
            self.app.prepare(
                ctx_id=0,
                det_size=(settings.det_size, settings.det_size),
                det_thresh=settings.detection_threshold
            )
            
            self._initialized = True
            logger.info("InsightFace model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            raise
    
    def is_initialized(self) -> bool:
        """Check if model is loaded"""
        return self._initialized
    
    def detect_and_embed(self, image: np.ndarray) -> List[DetectedFace]:
        """
        Detect faces and generate embeddings
        
        Args:
            image: numpy array (BGR format from cv2.imread)
        
        Returns:
            List of DetectedFace objects
        """
        if not self._initialized:
            self.initialize()
        
        try:
            # Detect faces
            faces = self.app.get(image)
            
            if len(faces) == 0:
                logger.debug("No faces detected in image")
                return []
            
            # Get image dimensions for normalization
            img_height, img_width = image.shape[:2]
            
            detected_faces = []
            for face in faces:
                # Extract bbox and normalize to [0-1]
                bbox_raw = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox_raw
                
                # Clip to image boundaries (sometimes InsightFace returns slightly out of bounds)
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(img_width, x2)
                y2 = min(img_height, y2)
                
                bbox = BoundingBox(
                    x=max(0.0, float(x1) / img_width),
                    y=max(0.0, float(y1) / img_height),
                    w=min(1.0, float(x2 - x1) / img_width),
                    h=min(1.0, float(y2 - y1) / img_height)
                )
                
                # Extract embedding (512-dimensional for buffalo_l)
                embedding = face.normed_embedding.tolist()
                
                # Quality score (detection confidence)
                quality_score = float(face.det_score)
                
                # Extract landmarks (5 points)
                landmarks = None
                if hasattr(face, 'kps') and face.kps is not None:
                    kps = face.kps.astype(float)
                    landmarks = Landmarks(
                        left_eye=[float(kps[0][0]) / img_width, float(kps[0][1]) / img_height],
                        right_eye=[float(kps[1][0]) / img_width, float(kps[1][1]) / img_height],
                        nose=[float(kps[2][0]) / img_width, float(kps[2][1]) / img_height],
                        mouth_left=[float(kps[3][0]) / img_width, float(kps[3][1]) / img_height],
                        mouth_right=[float(kps[4][0]) / img_width, float(kps[4][1]) / img_height]
                    )
                
                detected_faces.append(DetectedFace(
                    bbox=bbox,
                    embedding=embedding,
                    quality_score=quality_score,
                    landmarks=landmarks
                ))
            
            logger.info(f"Detected {len(detected_faces)} faces")
            return detected_faces
            
        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            raise
    
    def load_image_from_path(self, image_path: str) -> Optional[np.ndarray]:
        """Load image from file path"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to load image from {image_path}")
                return None
            return image
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            return None
    
    def load_image_from_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """Load image from bytes"""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                logger.error("Failed to decode image from bytes")
                return None
            return image
        except Exception as e:
            logger.error(f"Error loading image from bytes: {e}")
            return None


# Global instance
face_detector = FaceDetectorService()

