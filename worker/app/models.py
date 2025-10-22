"""Pydantic models for request/response validation"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class JobType(str, Enum):
    DETECT = "detect"
    CLUSTER = "cluster"


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ============================================
# Request Models
# ============================================

class ProcessMediaRequest(BaseModel):
    """Request to detect faces in media"""
    job_id: str
    media_id: str
    event_id: str
    media_url: str  # Signed URL from Supabase Storage
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "media_id": "456e7890-e89b-12d3-a456-426614174111",
                "event_id": "789e0123-e89b-12d3-a456-426614174222",
                "media_url": "https://storage.supabase.co/..."
            }
        }


class ClusterEventRequest(BaseModel):
    """Request to cluster faces in an event"""
    job_id: str
    event_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "event_id": "789e0123-e89b-12d3-a456-426614174222"
            }
        }


# ============================================
# Response Models
# ============================================

class BoundingBox(BaseModel):
    """Normalized bounding box [0-1]"""
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    w: float = Field(..., ge=0, le=1)
    h: float = Field(..., ge=0, le=1)


class Landmarks(BaseModel):
    """Facial landmarks (5 points)"""
    left_eye: List[float]
    right_eye: List[float]
    nose: List[float]
    mouth_left: List[float]
    mouth_right: List[float]


class DetectedFace(BaseModel):
    """Single detected face"""
    bbox: BoundingBox
    embedding: List[float]
    quality_score: float
    landmarks: Optional[Landmarks] = None


class ProcessMediaResponse(BaseModel):
    """Response from face detection"""
    job_id: str
    media_id: str
    event_id: str
    faces_detected: int
    faces: List[DetectedFace]
    processing_time_seconds: float
    status: JobStatus


class ClusterInfo(BaseModel):
    """Information about a single cluster"""
    cluster_label: int
    face_count: int
    representative_face_id: str
    avg_quality: float


class ClusterEventResponse(BaseModel):
    """Response from clustering"""
    job_id: str
    event_id: str
    total_faces: int
    clusters_created: int
    noise_faces: int  # faces not assigned to any cluster
    clusters: List[ClusterInfo]
    processing_time_seconds: float
    status: JobStatus


class ErrorResponse(BaseModel):
    """Error response"""
    job_id: str
    error: str
    status: JobStatus = JobStatus.FAILED
    details: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    """Health check response"""
    model_config = {"protected_namespaces": ()}  # Allow model_ prefix
    
    status: str
    version: str
    model_loaded: bool
    gpu_available: bool

