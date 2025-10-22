"""Supabase client for database operations"""

from supabase import create_client, Client
from typing import List, Dict, Any, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """Handles all Supabase database operations"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    
    async def get_media_info(self, media_id: str) -> Optional[Dict[str, Any]]:
        """Get media metadata from database"""
        try:
            response = self.client.table('media') \
                .select('*') \
                .eq('id', media_id) \
                .single() \
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching media {media_id}: {e}")
            return None
    
    async def insert_faces(self, faces_data: List[Dict[str, Any]]) -> bool:
        """Bulk insert detected faces"""
        try:
            response = self.client.table('faces') \
                .insert(faces_data) \
                .execute()
            logger.info(f"Inserted {len(faces_data)} faces")
            return True
        except Exception as e:
            logger.error(f"Error inserting faces: {e}")
            return False
    
    async def get_event_faces(self, event_id: str, include_assigned: bool = False) -> List[Dict[str, Any]]:
        """Get all faces with embeddings for an event"""
        try:
            query = self.client.table('faces') \
                .select('id, embedding, quality_score, media_id, face_person_id') \
                .eq('event_id', event_id) \
                .not_.is_('embedding', 'null')
            
            # Optionally filter for unassigned faces only
            if not include_assigned:
                query = query.is_('face_person_id', 'null')
            
            response = query.execute()
            
            # Parse embeddings from string to list if needed
            for face in response.data:
                if isinstance(face['embedding'], str):
                    # pgvector returns as string, parse it
                    import json
                    # Remove brackets and parse
                    emb_str = face['embedding'].strip('[]')
                    face['embedding'] = [float(x) for x in emb_str.split(',')]
            
            return response.data
        except Exception as e:
            logger.error(f"Error fetching faces for event {event_id}: {e}")
            return []
    
    async def get_existing_face_persons(self, event_id: str) -> List[Dict[str, Any]]:
        """Get existing face_persons for an event"""
        try:
            response = self.client.table('face_persons') \
                .select('id, cluster_label, status, linked_user_id, representative_face_id') \
                .eq('event_id', event_id) \
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching face_persons for event {event_id}: {e}")
            return []
    
    async def get_face_embedding(self, face_id: str) -> Optional[List[float]]:
        """Get embedding for a specific face"""
        try:
            response = self.client.table('faces') \
                .select('embedding') \
                .eq('id', face_id) \
                .single() \
                .execute()
            
            embedding = response.data.get('embedding')
            if embedding and isinstance(embedding, str):
                import json
                emb_str = embedding.strip('[]')
                embedding = [float(x) for x in emb_str.split(',')]
            
            return embedding
        except Exception as e:
            logger.error(f"Error fetching embedding for face {face_id}: {e}")
            return None
    
    async def create_face_persons(self, face_persons_data: List[Dict[str, Any]]) -> bool:
        """Create face_person clusters"""
        try:
            response = self.client.table('face_persons') \
                .insert(face_persons_data) \
                .execute()
            logger.info(f"Created {len(face_persons_data)} face_persons")
            return True
        except Exception as e:
            logger.error(f"Error creating face_persons: {e}")
            return False
    
    async def update_face_assignments(self, assignments: List[Dict[str, str]]) -> bool:
        """Update face_person_id for multiple faces"""
        try:
            # Supabase doesn't have bulk update, so we batch them
            for assignment in assignments:
                self.client.table('faces') \
                    .update({'face_person_id': assignment['face_person_id']}) \
                    .eq('id', assignment['face_id']) \
                    .execute()
            logger.info(f"Updated {len(assignments)} face assignments")
            return True
        except Exception as e:
            logger.error(f"Error updating face assignments: {e}")
            return False
    
    async def update_job_status(
        self,
        job_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> bool:
        """Update ml_job status"""
        try:
            update_data = {
                'status': status,
                'updated_at': 'now()'
            }
            if result:
                update_data['result'] = result
            if error:
                update_data['error'] = error
            if status == 'processing':
                update_data['started_at'] = 'now()'
            elif status in ['completed', 'failed']:
                update_data['completed_at'] = 'now()'
            
            self.client.table('ml_jobs') \
                .update(update_data) \
                .eq('id', job_id) \
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            return False
    
    async def increment_job_attempts(self, job_id: str) -> bool:
        """Increment job attempts counter"""
        try:
            self.client.rpc('increment_job_attempts', {'job_id': job_id}).execute()
            return True
        except Exception as e:
            logger.error(f"Error incrementing attempts for job {job_id}: {e}")
            return False


# Global instance
supabase_service = SupabaseService()

