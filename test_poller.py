#!/usr/bin/env python3
"""
Test script to manually trigger pending jobs
"""

import asyncio
import httpx
import os
import sys
from typing import List, Dict, Any

# Configuration
WORKER_URL = os.getenv('WORKER_URL', 'http://localhost:8080')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

async def get_pending_jobs() -> List[Dict[str, Any]]:
    """Fetch pending jobs from Supabase"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/ml_jobs",
                headers={
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
                    'Content-Type': 'application/json'
                },
                params={
                    'status': 'eq.pending',
                    'order': 'created_at.asc'
                }
            )
            
            if response.status_code == 200:
                jobs = response.json()
                print(f"📋 Found {len(jobs)} pending jobs")
                for job in jobs:
                    print(f"  - Job {job['id'][:8]}: {job['job_type']} for event {job['event_id'][:8]}")
                return jobs
            else:
                print(f"❌ Failed to fetch jobs: {response.status_code}")
                return []
                
    except Exception as e:
        print(f"❌ Error fetching jobs: {e}")
        return []

async def process_job(job: Dict[str, Any]) -> bool:
    """Process a single job by calling the worker"""
    job_id = job['id']
    job_type = job['job_type']
    event_id = job['event_id']
    
    print(f"🚀 Processing job {job_id[:8]}... (type: {job_type})")
    
    try:
        if job_type == 'cluster':
            # Call clustering endpoint
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{WORKER_URL}/cluster",
                    json={
                        'job_id': job_id,
                        'event_id': event_id
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Cluster job {job_id[:8]} completed: {result.get('clusters_created', 0)} clusters")
                    return True
                else:
                    print(f"❌ Cluster job {job_id[:8]} failed: {response.status_code}")
                    return False
                    
        elif job_type == 'detect':
            print(f"ℹ️ Detect job {job_id[:8]} - skipping (handled by clustering)")
            return True
            
    except Exception as e:
        print(f"❌ Error processing job {job_id[:8]}: {e}")
        return False

async def main():
    """Main function"""
    print("🔍 Checking for pending jobs...")
    print(f"📍 Worker URL: {WORKER_URL}")
    print(f"📍 Supabase URL: {SUPABASE_URL}")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        print("Make sure you have a .env file with these variables")
        return
    
    # Get pending jobs
    pending_jobs = await get_pending_jobs()
    
    if pending_jobs:
        print(f"\n🚀 Processing {len(pending_jobs)} jobs...")
        
        # Process jobs one by one
        for job in pending_jobs:
            success = await process_job(job)
            if not success:
                print(f"⚠️ Job {job['id'][:8]} failed")
            print()
    else:
        print("✅ No pending jobs found")

if __name__ == "__main__":
    asyncio.run(main())
