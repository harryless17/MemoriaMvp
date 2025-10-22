"""
Job Queue Poller
Polls ml_jobs table and processes pending jobs
"""

import asyncio
import logging
import httpx
from typing import Optional
from app.config import settings
from app.services.supabase_client import supabase_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

POLL_INTERVAL = 10  # seconds


async def get_signed_url(media_id: str) -> Optional[str]:
    """Generate signed URL for media download"""
    try:
        # Get media storage path
        response = supabase_service.client.table('media') \
            .select('storage_path') \
            .eq('id', media_id) \
            .single() \
            .execute()
        
        if not response.data:
            logger.error(f"Media {media_id} not found")
            return None
        
        storage_path = response.data['storage_path']
        
        # Generate signed URL (valid for 1 hour)
        signed_url_response = supabase_service.client.storage \
            .from_('media') \
            .create_signed_url(storage_path, 3600)
        
        return signed_url_response.get('signedURL')
        
    except Exception as e:
        logger.error(f"Error getting signed URL for {media_id}: {e}")
        return None


async def process_detect_job(job: dict):
    """Process a detect job by calling worker's /process endpoint"""
    try:
        media_ids = job.get('media_ids', [])
        if not media_ids:
            logger.warning(f"Job {job['id']} has no media_ids")
            return
        
        # Process each media
        for media_id in media_ids:
            # Get signed URL
            media_url = await get_signed_url(media_id)
            if not media_url:
                logger.error(f"Could not get URL for media {media_id}")
                continue
            
            # Call worker /process endpoint
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    'http://localhost:8080/process',
                    json={
                        'job_id': job['id'],
                        'media_id': media_id,
                        'event_id': job['event_id'],
                        'media_url': media_url
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"Successfully processed media {media_id}")
                else:
                    logger.error(f"Failed to process media {media_id}: {response.text}")
                    
    except Exception as e:
        logger.error(f"Error processing detect job {job['id']}: {e}")


async def process_cluster_job(job: dict):
    """Process a cluster job by calling worker's /cluster endpoint"""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                'http://localhost:8080/cluster',
                json={
                    'job_id': job['id'],
                    'event_id': job['event_id']
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully clustered event {job['event_id']}")
            else:
                logger.error(f"Failed to cluster: {response.text}")
                
    except Exception as e:
        logger.error(f"Error processing cluster job {job['id']}: {e}")


async def poll_and_process():
    """Main polling loop"""
    logger.info("Starting job poller...")
    
    while True:
        try:
            # Fetch pending jobs (ordered by priority and creation time)
            response = supabase_service.client.table('ml_jobs') \
                .select('*') \
                .eq('status', 'pending') \
                .order('priority', desc=True) \
                .order('created_at', desc=False) \
                .limit(1) \
                .execute()
            
            jobs = response.data
            
            if jobs and len(jobs) > 0:
                job = jobs[0]
                logger.info(f"Processing job {job['id']} (type: {job['job_type']})")
                
                # Mark as processing
                await supabase_service.update_job_status(job['id'], 'processing')
                
                # Process based on type
                if job['job_type'] == 'detect':
                    await process_detect_job(job)
                elif job['job_type'] == 'cluster':
                    await process_cluster_job(job)
                else:
                    logger.warning(f"Unknown job type: {job['job_type']}")
            else:
                # No jobs, wait before next poll
                await asyncio.sleep(POLL_INTERVAL)
                
        except Exception as e:
            logger.error(f"Error in polling loop: {e}")
            await asyncio.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    logger.info(f"Worker Poller - Polling every {POLL_INTERVAL}s")
    logger.info(f"Supabase URL: {settings.supabase_url}")
    
    asyncio.run(poll_and_process())

