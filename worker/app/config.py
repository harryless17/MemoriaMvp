"""Configuration management using pydantic-settings"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # Callback
    callback_url: str
    callback_secret: str
    
    # ML Configuration
    detection_threshold: float = 0.5
    det_size: int = 640
    min_cluster_size: int = 3
    min_samples: int = 2
    cluster_epsilon: float = 0.5  # Increased from 0.4 to allow more flexible clustering
    
    # Worker Configuration
    max_retries: int = 3
    batch_size: int = 10
    timeout_seconds: int = 300
    
    # GPU Configuration
    use_gpu: bool = False
    cuda_visible_devices: Optional[str] = "0"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

