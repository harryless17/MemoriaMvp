"""
FastAPI ML Worker for Face Clustering
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import httpx
import numpy as np
from typing import List, Dict
import tempfile
import os

from app.config import settings
from app.models import (
    ProcessMediaRequest,
    ClusterEventRequest,
    ProcessMediaResponse,
    ClusterEventResponse,
    ErrorResponse,
    HealthResponse,
    JobStatus,
    ClusterInfo
)
from app.services.face_detector import face_detector
from app.services.clustering import clustering_service
from app.services.supabase_client import supabase_service


def create_smart_clusters(all_faces_data: List, clustering_service) -> Dict[int, List]:
    """
    Create smart clusters using global analysis:
    - Filter by quality (threshold 0.7)
    - Global clustering across all photos
    - High confidence assignments only
    """
    # Filter faces by quality
    quality_threshold = 0.7
    high_quality_faces = []
    low_quality_faces = []
    
    for face_data in all_faces_data:
        if face_data['quality_score'] >= quality_threshold:
            high_quality_faces.append(face_data)
        else:
            low_quality_faces.append(face_data)
    
    logger.info(f"Quality filtering: {len(high_quality_faces)} high quality, {len(low_quality_faces)} low quality")
    
    if not high_quality_faces:
        logger.info("No high quality faces found, skipping AI clustering")
        return {}
    
    # Extract embeddings for high quality faces
    face_ids = [f['id'] for f in high_quality_faces]
    embeddings = np.array([f['embedding'] for f in high_quality_faces], dtype=np.float32)
    quality_scores = [f['quality_score'] for f in high_quality_faces]
    
    # Perform global clustering with strict parameters
    logger.info(f"Performing global clustering on {len(embeddings)} high quality faces...")
    clusters = clustering_service.cluster_faces(embeddings, face_ids, quality_scores)
    
    # Filter clusters by confidence (min 2 faces per cluster for confidence)
    confident_clusters = {}
    cluster_label = 0
    
    for cluster_id, cluster_faces in clusters.items():
        if cluster_id == -1:  # Skip noise
            continue
            
        if len(cluster_faces) >= 2:  # High confidence: multiple faces
            confident_clusters[cluster_label] = cluster_faces
            cluster_label += 1
        elif len(cluster_faces) == 1:  # Single face: check quality
            face_id, quality = cluster_faces[0]
            if quality >= 0.8:  # Very high quality single face
                confident_clusters[cluster_label] = cluster_faces
                cluster_label += 1
    
    logger.info(f"Created {len(confident_clusters)} confident clusters from {len(clusters)} total clusters")
    
    return confident_clusters


from app.services.smart_clustering import SmartClusteringService
from app import __version__

# Initialize smart clustering service
smart_clustering_service = SmartClusteringService(similarity_threshold=0.6)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Memoria Face Clustering Worker",
    description="ML Worker for face detection and clustering using InsightFace + HDBSCAN",
    version=__version__
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Startup & Health
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize ML model on startup"""
    logger.info("Starting up ML Worker...")
    try:
        # Lazy load - model will be loaded on first request
        logger.info("ML Worker ready (model will load on first request)")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version=__version__,
        model_loaded=face_detector.is_initialized(),
        gpu_available=settings.use_gpu
    )


# ============================================
# Helper Functions
# ============================================

async def send_callback(job_id: str, status: str, result: dict = None, error: str = None):
    """Send callback to Edge Function"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.callback_url,
                json={
                    "job_id": job_id,
                    "status": status,
                    "result": result,
                    "error": error
                },
                headers={
                    "Authorization": f"Bearer {settings.callback_secret}"
                }
            )
            response.raise_for_status()
            logger.info(f"Callback sent for job {job_id}: {status}")
    except Exception as e:
        logger.error(f"Failed to send callback for job {job_id}: {e}")


async def download_image(url: str) -> bytes:
    """Download image from signed URL"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.error(f"Failed to download image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")


# ============================================
# Face Detection Endpoint
# ============================================

@app.post("/process", response_model=ProcessMediaResponse)
async def process_media(request: ProcessMediaRequest, background_tasks: BackgroundTasks):
    """
    Detect faces and generate embeddings for a single media item
    
    Process:
    1. Download image from signed URL
    2. Detect faces using InsightFace
    3. Generate embeddings
    4. Save to database
    5. Send callback
    """
    start_time = time.time()
    job_id = request.job_id
    
    logger.info(f"Processing media {request.media_id} for job {job_id}")
    
    try:
        # Update job status to processing
        await supabase_service.update_job_status(job_id, "processing")
        
        # Download image
        logger.info(f"Downloading image from {request.media_url[:50]}...")
        image_bytes = await download_image(request.media_url)
        
        # Load image
        image = face_detector.load_image_from_bytes(image_bytes)
        if image is None:
            raise ValueError("Failed to load image")
        
        # Detect faces and generate embeddings
        logger.info("Detecting faces...")
        detected_faces = face_detector.detect_and_embed(image)
        
        # Prepare data for database
        faces_data = []
        for face in detected_faces:
            faces_data.append({
                'media_id': request.media_id,
                'event_id': request.event_id,
                'bbox': face.bbox.model_dump(),
                'embedding': face.embedding,
                'quality_score': face.quality_score,
                'landmarks': face.landmarks.model_dump() if face.landmarks else None
            })
        
        # Insert into database
        if faces_data:
            success = await supabase_service.insert_faces(faces_data)
            if not success:
                raise ValueError("Failed to insert faces into database")
        
        processing_time = time.time() - start_time
        
        result = {
            'media_id': request.media_id,
            'faces_detected': len(detected_faces),
            'processing_time_seconds': processing_time
        }
        
        # Update job status
        await supabase_service.update_job_status(
            job_id,
            "completed",
            result=result
        )
        
        # Send callback in background
        background_tasks.add_task(
            send_callback,
            job_id,
            "completed",
            result=result
        )
        
        logger.info(f"Successfully processed media {request.media_id}: {len(detected_faces)} faces in {processing_time:.2f}s")
        
        return ProcessMediaResponse(
            job_id=job_id,
            media_id=request.media_id,
            event_id=request.event_id,
            faces_detected=len(detected_faces),
            faces=detected_faces,
            processing_time_seconds=processing_time,
            status=JobStatus.COMPLETED
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error processing media {request.media_id}: {error_msg}")
        
        # Update job status
        await supabase_service.update_job_status(
            job_id,
            "failed",
            error=error_msg
        )
        await supabase_service.increment_job_attempts(job_id)
        
        # Send callback
        background_tasks.add_task(
            send_callback,
            job_id,
            "failed",
            error=error_msg
        )
        
        raise HTTPException(status_code=500, detail=error_msg)


# ============================================
# Clustering Endpoint
# ============================================

@app.post("/cluster", response_model=ClusterEventResponse)
async def cluster_event(request: ClusterEventRequest, background_tasks: BackgroundTasks):
    """
    Cluster faces for an entire event
    
    Process:
    0. Detect faces on unprocessed media
    1. Fetch all faces with embeddings from database
    2. Run HDBSCAN clustering
    3. Create face_persons for each cluster
    4. Update face assignments
    5. Send callback
    """
    start_time = time.time()
    job_id = request.job_id
    
    logger.info(f"Clustering event {request.event_id} for job {job_id}")
    
    try:
        # Update job status
        await supabase_service.update_job_status(job_id, "processing")
        
        # Step 0: Detect faces on unprocessed media
        logger.info("Checking for unprocessed media...")
        
        # Get all media for this event
        media_response = supabase_service.client.table('media') \
            .select('id, storage_path') \
            .eq('event_id', request.event_id) \
            .execute()
        
        all_media = media_response.data if media_response.data else []
        
        # Get media that already have faces detected
        faces_response = supabase_service.client.table('faces') \
            .select('media_id') \
            .eq('event_id', request.event_id) \
            .execute()
        
        processed_media_ids = set(f['media_id'] for f in (faces_response.data or []))
        unprocessed_media = [m for m in all_media if m['id'] not in processed_media_ids]
        
        logger.info(f"Found {len(unprocessed_media)} unprocessed media out of {len(all_media)} total")
        
        # Detect faces on unprocessed media
        if unprocessed_media:
            logger.info(f"Detecting faces on {len(unprocessed_media)} new photos...")
            for media in unprocessed_media:
                try:
                    # Generate signed URL
                    signed_url_response = supabase_service.client.storage.from_('media').create_signed_url(
                        media['storage_path'],
                        60 * 5  # 5 minutes
                    )
                    
                    if not signed_url_response or 'signedURL' not in signed_url_response:
                        logger.warning(f"Failed to generate signed URL for media {media['id']}")
                        continue
                    
                    signed_url = signed_url_response['signedURL']
                    
                    # Download and detect faces
                    logger.info(f"Processing media {media['id'][:8]}...")
                    image_bytes = await download_image(signed_url)
                    image = face_detector.load_image_from_bytes(image_bytes)
                    
                    if image is None:
                        logger.warning(f"Failed to load image for media {media['id']}")
                        continue
                    
                    detected_faces = face_detector.detect_and_embed(image)
                    
                    # Save faces to database
                    if detected_faces:
                        faces_data = []
                        for face in detected_faces:
                            faces_data.append({
                                'media_id': media['id'],
                                'event_id': request.event_id,
                                'bbox': face.bbox.model_dump(),
                                'embedding': face.embedding,  # Already a list from face_detector
                                'quality_score': float(face.quality_score)
                            })
                        
                        supabase_service.client.table('faces').insert(faces_data).execute()
                        logger.info(f"Saved {len(detected_faces)} faces for media {media['id'][:8]}")
                    else:
                        logger.info(f"No faces detected in media {media['id'][:8]}")
                        
                except Exception as e:
                    logger.error(f"Error processing media {media['id']}: {e}")
                    # Continue with other media
                    continue
        
        # Step 1: Get existing clusters and determine which to preserve
        logger.info("Fetching existing clusters...")
        existing_clusters = await supabase_service.get_existing_face_persons(request.event_id)
        
        preserve_clusters, delete_cluster_ids = smart_clustering_service.filter_preserved_and_deletable(existing_clusters)
        
        logger.info(f"Found {len(existing_clusters)} existing clusters: {len(preserve_clusters)} to preserve, {len(delete_cluster_ids)} to delete")
        
        # Step 2: Delete non-preserved clusters
        if delete_cluster_ids:
            logger.info(f"Deleting {len(delete_cluster_ids)} non-preserved clusters...")
            for cluster_id in delete_cluster_ids:
                supabase_service.client.table('face_persons').delete().eq('id', cluster_id).execute()
        
        # Step 3: Fetch ALL faces (including already assigned ones for potential reassignment)
        logger.info("Fetching all faces from database...")
        all_faces = await supabase_service.get_event_faces(request.event_id, include_assigned=True)
        
        # Step 4: Try to assign faces to existing preserved clusters
        assigned_faces, unassigned_faces = await smart_clustering_service.assign_faces_to_existing_clusters(
            all_faces,
            preserve_clusters,
            supabase_service.get_face_embedding
        )
        
        # Step 5: Update face assignments for faces matched to existing clusters
        if assigned_faces:
            logger.info(f"Updating {len(assigned_faces)} face assignments...")
            for assignment in assigned_faces:
                supabase_service.client.table('faces') \
                    .update({'face_person_id': assignment['face_person_id']}) \
                    .eq('id', assignment['face_id']) \
                    .execute()
                
                # Also update in memory for the next step
                for face in all_faces:
                    if face['id'] == assignment['face_id']:
                        face['face_person_id'] = assignment['face_person_id']
                        break
        
        # Step 5b: Create media_tags for ALL faces in 'linked' clusters (not just newly assigned)
        # Get all linked clusters
        linked_clusters = [c for c in preserve_clusters if c['status'] == 'linked' and c.get('linked_user_id')]
        
        if linked_clusters:
            logger.info(f"Found {len(linked_clusters)} linked clusters, creating tags for all their faces...")
            
            for cluster in linked_clusters:
                # Get all faces belonging to this cluster (now includes updated assignments)
                cluster_faces = [f for f in all_faces if f.get('face_person_id') == cluster['id']]
                logger.info(f"Cluster {cluster['id'][:8]}: {len(cluster_faces)} faces, linked_user_id: {cluster['linked_user_id'][:8]}")
                
                for face in cluster_faces:
                    # Get the event_member entry for this user
                    member_response = supabase_service.client.table('event_members') \
                        .select('id') \
                        .eq('event_id', request.event_id) \
                        .eq('user_id', cluster['linked_user_id']) \
                        .execute()
                    
                    if member_response.data and len(member_response.data) > 0:
                        member_id = member_response.data[0]['id']
                        
                        # Create or update the media_tag
                        try:
                            supabase_service.client.table('media_tags').upsert({
                                'media_id': face['media_id'],
                                'member_id': member_id,
                                'tagged_by': cluster['linked_user_id'],  # System-tagged
                                'source': 'face_clustering',
                                'bbox': face.get('bbox'),
                                'face_id': face['id']
                            }, on_conflict='media_id,member_id').execute()
                            
                            logger.info(f"✅ Created tag for media {face['media_id'][:8]} -> member {member_id[:8]}")
                        except Exception as e:
                            logger.warning(f"❌ Failed to create tag for face {face['id'][:8]}: {e}")
                    else:
                        logger.warning(f"⚠️ No event_member found for user {cluster['linked_user_id'][:8]}")
        
        # Step 6: Cluster the unassigned faces to create new clusters
        faces_data = unassigned_faces
        
        if not faces_data:
            logger.info(f"No unassigned faces to cluster for event {request.event_id}")
            result = {
                'event_id': request.event_id,
                'total_faces': len(all_faces),
                'preserved_clusters': len(preserve_clusters),
                'assigned_to_existing': len(assigned_faces),
                'new_clusters_created': 0,
                'noise_faces': 0
            }
            await supabase_service.update_job_status(job_id, "completed", result=result)
            background_tasks.add_task(send_callback, job_id, "completed", result=result)
            
            return ClusterEventResponse(
                job_id=job_id,
                event_id=request.event_id,
                total_faces=len(all_faces),
                clusters_created=0,
                noise_faces=0,
                clusters=[],
                processing_time_seconds=time.time() - start_time,
                status=JobStatus.COMPLETED
            )
        
        # Extract embeddings and metadata
        face_ids = [f['id'] for f in faces_data]
        embeddings = np.array([f['embedding'] for f in faces_data], dtype=np.float32)
        quality_scores = [f['quality_score'] for f in faces_data]
        
        logger.info(f"Clustering {len(embeddings)} faces...")
        
        # Create smart clusters using global analysis
        logger.info(f"Creating smart clusters from {len(faces_data)} faces...")
        smart_clusters = create_smart_clusters(faces_data, clustering_service)
        
        # Use smart clusters
        clusters = smart_clusters
        
        # Get max cluster_label to avoid conflicts
        max_label_response = supabase_service.client.table('face_persons') \
            .select('cluster_label') \
            .eq('event_id', request.event_id) \
            .order('cluster_label', desc=True) \
            .limit(1) \
            .execute()
        
        max_existing_label = max_label_response.data[0]['cluster_label'] if max_label_response.data else -1
        label_offset = max_existing_label + 1
        logger.info(f"Max existing cluster_label: {max_existing_label}, using offset: {label_offset}")
        
        # Create face_persons and update assignments
        face_persons_data = []
        face_assignments = []
        cluster_infos = []
        
        # Map old labels to new labels (with offset)
        label_mapping = {}
        
        for cluster_label, cluster_faces in clusters.items():
            if cluster_label == -1:
                # Skip noise for now (could handle separately)
                continue
            
            # Apply offset to avoid conflicts
            new_label = cluster_label + label_offset
            label_mapping[cluster_label] = new_label
            
            # Select representative face
            representative_id = clustering_service.select_representative_face(cluster_faces)
            
            # Compute stats
            stats = clustering_service.compute_cluster_stats(cluster_faces)
            
            # Mark as AI-generated cluster
            stats['is_ai_generated'] = True
            stats['confidence'] = 'high' if len(cluster_faces) >= 2 else 'medium'
            stats['face_count'] = len(cluster_faces)
            
            # Prepare face_person data with adjusted label
            face_person = {
                'event_id': request.event_id,
                'cluster_label': new_label,
                'representative_face_id': representative_id,
                'status': 'pending',
                'metadata': stats
            }
            face_persons_data.append(face_person)
        
        # Insert face_persons (we need to get IDs back)
        if face_persons_data:
            logger.info(f"Creating {len(face_persons_data)} face_persons...")
            success = await supabase_service.create_face_persons(face_persons_data)
            if not success:
                raise ValueError("Failed to create face_persons")
            
            # Fetch created face_persons to get IDs
            response = supabase_service.client.table('face_persons') \
                .select('id, cluster_label') \
                .eq('event_id', request.event_id) \
                .execute()
            
            label_to_id = {fp['cluster_label']: fp['id'] for fp in response.data}
            
            # Prepare face assignments using new labels
            for old_label, cluster_faces in clusters.items():
                if old_label == -1:
                    continue
                
                # Use the mapped label
                new_label = label_mapping.get(old_label)
                if new_label is None:
                    continue
                    
                face_person_id = label_to_id.get(new_label)
                if face_person_id:
                    for face_id, quality in cluster_faces:
                        face_assignments.append({
                            'face_id': face_id,
                            'face_person_id': face_person_id
                        })
                    
                    cluster_infos.append(ClusterInfo(
                        cluster_label=new_label,
                        face_count=len(cluster_faces),
                        representative_face_id=clustering_service.select_representative_face(cluster_faces),
                        avg_quality=float(np.mean([q for _, q in cluster_faces]))
                    ))
            
            # Update face assignments
            if face_assignments:
                logger.info(f"Updating {len(face_assignments)} face assignments...")
                success = await supabase_service.update_face_assignments(face_assignments)
                if not success:
                    logger.warning("Some face assignments may have failed")
        
        # Step 7: Handle noise faces - create individual clusters for each
        noise_faces = clusters.get(-1, [])
        if noise_faces:
            logger.info(f"Creating individual clusters for {len(noise_faces)} noise faces...")
            
            # Start from the next available label
            next_label = max_existing_label + 1 + len(face_persons_data)
            
            noise_face_persons = []
            noise_assignments = []
            
            for idx, (face_id, quality) in enumerate(noise_faces):
                individual_label = next_label + idx
                
                # Create a face_person for this single face
                noise_face_persons.append({
                    'event_id': request.event_id,
                    'cluster_label': individual_label,
                    'representative_face_id': face_id,
                    'status': 'pending',
                    'metadata': {
                        'face_count': 1,
                        'avg_quality': float(quality),
                        'min_quality': float(quality),
                        'max_quality': float(quality),
                        'is_singleton': True  # Mark as single-face cluster
                    }
                })
            
            # Insert noise face_persons
            if noise_face_persons:
                success = await supabase_service.create_face_persons(noise_face_persons)
                if success:
                    # Fetch created face_persons
                    response = supabase_service.client.table('face_persons') \
                        .select('id, cluster_label') \
                        .eq('event_id', request.event_id) \
                        .gte('cluster_label', next_label) \
                        .execute()
                    
                    label_to_id_noise = {fp['cluster_label']: fp['id'] for fp in response.data}
                    
                    # Assign noise faces
                    for idx, (face_id, quality) in enumerate(noise_faces):
                        individual_label = next_label + idx
                        face_person_id = label_to_id_noise.get(individual_label)
                        if face_person_id:
                            noise_assignments.append({
                                'face_id': face_id,
                                'face_person_id': face_person_id
                            })
                    
                    # Update assignments
                    if noise_assignments:
                        logger.info(f"Assigning {len(noise_assignments)} noise faces to individual clusters...")
                        await supabase_service.update_face_assignments(noise_assignments)
                        
                    logger.info(f"✅ Created {len(noise_face_persons)} individual clusters for noise faces")
        
        processing_time = time.time() - start_time
        noise_count = len(noise_faces) if noise_faces else 0
        
        result = {
            'event_id': request.event_id,
            'total_faces': len(all_faces),
            'preserved_clusters': len(preserve_clusters),
            'assigned_to_existing': len(assigned_faces),
            'new_clusters_created': len(face_persons_data),
            'noise_faces': noise_count,
            'processing_time_seconds': processing_time
        }
        
        # Update job status
        await supabase_service.update_job_status(job_id, "completed", result=result)
        
        # Send callback
        background_tasks.add_task(send_callback, job_id, "completed", result=result)
        
        logger.info(f"Successfully clustered event {request.event_id}: "
                   f"{len(preserve_clusters)} preserved, {len(assigned_faces)} reassigned, "
                   f"{len(face_persons_data)} new clusters, {noise_count} noise in {processing_time:.2f}s")
        
        return ClusterEventResponse(
            job_id=job_id,
            event_id=request.event_id,
            total_faces=len(all_faces),
            clusters_created=len(face_persons_data),
            noise_faces=noise_count,
            clusters=cluster_infos,
            processing_time_seconds=processing_time,
            status=JobStatus.COMPLETED
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error clustering event {request.event_id}: {error_msg}")
        
        # Update job status
        await supabase_service.update_job_status(job_id, "failed", error=error_msg)
        await supabase_service.increment_job_attempts(job_id)
        
        # Send callback
        background_tasks.add_task(send_callback, job_id, "failed", error=error_msg)
        
        raise HTTPException(status_code=500, detail=error_msg)


# ============================================
# Error Handler
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

