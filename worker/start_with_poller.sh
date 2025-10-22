#!/bin/bash

echo "🚀 Starting ML Worker with Job Poller..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📍 Worker URL: $WORKER_URL"
echo "📍 Supabase URL: $SUPABASE_URL"

# Start the worker in background
echo "🔄 Starting ML Worker..."
uvicorn app.main:app --host 0.0.0.0 --port 8080 &
WORKER_PID=$!

# Wait a bit for worker to start
sleep 3

# Start the job poller in background
echo "🔄 Starting Job Poller..."
python3 job_poller.py &
POLLER_PID=$!

echo "✅ Both services started!"
echo "📍 Worker PID: $WORKER_PID"
echo "📍 Poller PID: $POLLER_PID"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
trap 'echo "🛑 Stopping services..."; kill $WORKER_PID $POLLER_PID; exit' INT

# Keep script running
wait
