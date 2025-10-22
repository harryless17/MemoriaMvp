#!/usr/bin/env python3
"""
Script to process all media in an event for face detection + clustering
Run this locally after clicking "Start Clustering" in the UI
"""

import sys
import os
import httpx
import asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
WORKER_URL = 'http://localhost:8080'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


async def process_event(event_id: str):
    """Process all unprocessed media in an event"""
    
    print(f"🔍 Processing event: {event_id}")
    
    # 1. Find all media without faces
    response = supabase.table('media').select('id, storage_path').eq('event_id', event_id).execute()
    all_media = response.data
    
    # Get already processed media
    faces_response = supabase.table('faces').select('media_id').eq('event_id', event_id).execute()
    processed_ids = set(f['media_id'] for f in faces_response.data)
    
    unprocessed = [m for m in all_media if m['id'] not in processed_ids]
    
    print(f"📊 Total media: {len(all_media)}, Unprocessed: {len(unprocessed)}")
    
    if len(unprocessed) == 0:
        print("✅ All media already processed. Skipping to clustering...")
    else:
        # 2. Process each media
        print(f"🎯 Detecting faces in {len(unprocessed)} photos...")
        
        for idx, media in enumerate(unprocessed, 1):
            print(f"  [{idx}/{len(unprocessed)}] Processing {media['id'][:8]}...")
            
            # Generate signed URL
            signed_response = supabase.storage.from_('media').create_signed_url(
                media['storage_path'], 
                3600
            )
            signed_url = signed_response['signedURL']
            
            # Create job
            job_response = supabase.table('ml_jobs').insert({
                'job_type': 'detect',
                'event_id': event_id,
                'media_ids': [media['id']],
                'status': 'pending',
                'priority': 'high'
            }).execute()
            job_id = job_response.data[0]['id']
            
            # Call worker
            async with httpx.AsyncClient(timeout=60.0) as client:
                try:
                    response = await client.post(
                        f'{WORKER_URL}/process',
                        json={
                            'job_id': job_id,
                            'media_id': media['id'],
                            'event_id': event_id,
                            'media_url': signed_url
                        }
                    )
                    result = response.json()
                    print(f"    ✅ Detected {result.get('faces_detected', 0)} faces")
                except Exception as e:
                    print(f"    ❌ Error: {e}")
    
    # 3. Run clustering
    print(f"\n🧠 Clustering faces...")
    
    # Check how many faces we have
    faces_count_response = supabase.table('faces').select('id', count='exact').eq('event_id', event_id).execute()
    total_faces = faces_count_response.count
    
    print(f"📊 Total faces detected: {total_faces}")
    
    if total_faces < 3:
        print("⚠️  Too few faces to cluster (minimum 3 required)")
        return
    
    # Create cluster job
    cluster_job_response = supabase.table('ml_jobs').insert({
        'job_type': 'cluster',
        'event_id': event_id,
        'status': 'pending',
        'priority': 'high'
    }).execute()
    cluster_job_id = cluster_job_response.data[0]['id']
    
    # Call worker
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f'{WORKER_URL}/cluster',
            json={
                'job_id': cluster_job_id,
                'event_id': event_id
            }
        )
        result = response.json()
        
        print(f"\n✅ Clustering complete!")
        print(f"   - Clusters created: {result.get('clusters_created', 0)}")
        print(f"   - Noise faces: {result.get('noise_faces', 0)}")
        print(f"   - Processing time: {result.get('processing_time_seconds', 0):.2f}s")
    
    print(f"\n🎉 Event processing complete!")
    print(f"👉 Go to http://localhost:3000/events/{event_id}/analyse to review clusters")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python process_event.py <event_id>")
        sys.exit(1)
    
    event_id = sys.argv[1]
    asyncio.run(process_event(event_id))

