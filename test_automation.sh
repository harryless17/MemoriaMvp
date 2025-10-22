#!/bin/bash

echo "🧪 Testing ML System Automation..."

# Check if there are pending jobs
echo "🔍 Checking for pending jobs..."

# Get pending jobs using curl
PENDING_JOBS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/ml_jobs?status=eq.pending&order=created_at.asc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "📋 Pending jobs response:"
echo "$PENDING_JOBS" | jq '.' 2>/dev/null || echo "$PENDING_JOBS"

# Count pending jobs
JOB_COUNT=$(echo "$PENDING_JOBS" | jq '. | length' 2>/dev/null || echo "0")

if [ "$JOB_COUNT" -gt 0 ]; then
    echo "🚀 Found $JOB_COUNT pending jobs"
    
    # Extract first job ID
    FIRST_JOB_ID=$(echo "$PENDING_JOBS" | jq -r '.[0].id' 2>/dev/null)
    FIRST_EVENT_ID=$(echo "$PENDING_JOBS" | jq -r '.[0].event_id' 2>/dev/null)
    
    if [ "$FIRST_JOB_ID" != "null" ] && [ "$FIRST_JOB_ID" != "" ]; then
        echo "🎯 Processing job: $FIRST_JOB_ID"
        
        # Process the job
        RESPONSE=$(curl -s -X POST "http://localhost:8080/cluster" \
          -H "Content-Type: application/json" \
          -d "{\"job_id\": \"$FIRST_JOB_ID\", \"event_id\": \"$FIRST_EVENT_ID\"}")
        
        echo "✅ Job processing response:"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    fi
else
    echo "✅ No pending jobs found"
fi

echo ""
echo "🔍 Checking worker health..."
curl -s http://localhost:8080/health | jq '.' 2>/dev/null || echo "Worker not responding"
