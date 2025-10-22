#!/usr/bin/env python3
"""
Job Poller - Automatically processes pending ML jobs
"""

import asyncio
import httpx
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any
import json

# Configuration
WORKER_URL = os.getenv('WORKER_URL', 'http://localhost:8080')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
POLL_INTERVAL = 5  # seconds

class JobPoller:
    def __init__(self):
        self.worker_url = WORKER_URL
        self.supabase_url = SUPABASE_URL
        self.supabase_key = SUPABASE_SERVICE_ROLE_KEY
        
        if not self.supabase_url or not self.supabase_key:
            print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
            sys.exit(1)
    
    async def get_pending_jobs(self) -> List[Dict[str, Any]]:
        """Fetch pending jobs from Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/ml_jobs",
                    headers={
                        'apikey': self.supabase_key,
                        'Authorization': f'Bearer {self.supabase_key}',
                        'Content-Type': 'application/json'
                    },
                    params={
                        'status': 'eq.pending',
                        'order': 'created_at.asc'
                    }
                )
                
                if response.status_code == 200:
                    jobs = response.json()
                    return jobs
                else:
                    print(f"❌ Failed to fetch jobs: {response.status_code}")
                    return []
                    
        except Exception as e:
            print(f"❌ Error fetching jobs: {e}")
            return []
    
    async def process_job(self, job: Dict[str, Any]) -> bool:
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
                        f"{self.worker_url}/cluster",
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
                # For detect jobs, we need to get the media info first
                print(f"ℹ️ Detect job {job_id[:8]} - skipping (handled by clustering)")
                return True
                
        except Exception as e:
            print(f"❌ Error processing job {job_id[:8]}: {e}")
            return False
    
    async def poll_and_process(self):
        """Main polling loop"""
        print(f"🔄 Job Poller started - polling every {POLL_INTERVAL}s")
        print(f"📍 Worker URL: {self.worker_url}")
        print(f"📍 Supabase URL: {self.supabase_url}")
        
        while True:
            try:
                # Get pending jobs
                pending_jobs = await self.get_pending_jobs()
                
                if pending_jobs:
                    print(f"📋 Found {len(pending_jobs)} pending jobs")
                    
                    # Process jobs one by one
                    for job in pending_jobs:
                        success = await self.process_job(job)
                        if not success:
                            print(f"⚠️ Job {job['id'][:8]} failed, will retry later")
                        
                        # Small delay between jobs
                        await asyncio.sleep(1)
                else:
                    print(f"⏳ No pending jobs - waiting {POLL_INTERVAL}s...")
                
                # Wait before next poll
                await asyncio.sleep(POLL_INTERVAL)
                
            except KeyboardInterrupt:
                print("\n🛑 Job Poller stopped by user")
                break
            except Exception as e:
                print(f"❌ Polling error: {e}")
                await asyncio.sleep(POLL_INTERVAL)

async def main():
    """Main entry point"""
    poller = JobPoller()
    await poller.poll_and_process()

if __name__ == "__main__":
    asyncio.run(main())
