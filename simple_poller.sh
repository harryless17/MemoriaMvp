#!/bin/bash

# Simple Job Poller - Checks for pending cluster jobs and processes them
# Run this script in the background: ./simple_poller.sh &

echo "🔄 Simple Job Poller started"

# Load environment variables
if [ -f "worker/.env" ]; then
    export $(cat worker/.env | grep -v '^#' | xargs)
fi

WORKER_URL=${WORKER_URL:-http://localhost:8080}
POLL_INTERVAL=${POLL_INTERVAL:-10}

echo "📍 Worker URL: $WORKER_URL"
echo "⏱️  Poll interval: ${POLL_INTERVAL}s"
echo ""

while true; do
    # Get pending cluster jobs
    PENDING_JOBS=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/ml_jobs?job_type=eq.cluster&status=eq.pending&order=created_at.asc&limit=1" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
    
    # Check if we have jobs
    JOB_COUNT=$(echo "$PENDING_JOBS" | jq '. | length' 2>/dev/null || echo "0")
    
    if [ "$JOB_COUNT" -gt 0 ]; then
        JOB_ID=$(echo "$PENDING_JOBS" | jq -r '.[0].id' 2>/dev/null)
        EVENT_ID=$(echo "$PENDING_JOBS" | jq -r '.[0].event_id' 2>/dev/null)
        
        if [ "$JOB_ID" != "null" ] && [ "$JOB_ID" != "" ]; then
            echo "🚀 [$(date '+%H:%M:%S')] Processing job: ${JOB_ID:0:8}..."
            
            # Process the job
            RESPONSE=$(curl -s -X POST "${WORKER_URL}/cluster" \
                -H "Content-Type: application/json" \
                -d "{\"job_id\": \"$JOB_ID\", \"event_id\": \"$EVENT_ID\"}")
            
            STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
            
            if [ "$STATUS" == "completed" ]; then
                CLUSTERS=$(echo "$RESPONSE" | jq -r '.clusters_created' 2>/dev/null)
                echo "✅ [$(date '+%H:%M:%S')] Job completed: $CLUSTERS clusters created"
            else
                echo "❌ [$(date '+%H:%M:%S')] Job failed"
            fi
        fi
    else
        echo "⏳ [$(date '+%H:%M:%S')] No pending jobs"
    fi
    
    sleep $POLL_INTERVAL
done
