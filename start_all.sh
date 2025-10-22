#!/bin/bash

echo "🚀 Starting Complete Memoria System..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start ML Worker with Docker Compose
echo "📦 Starting ML Worker..."
docker-compose up -d ml-worker

# Wait for worker to be ready
echo "⏳ Waiting for ML Worker to be ready..."
sleep 5

# Check worker health
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ ML Worker is ready"
else
    echo "❌ ML Worker failed to start"
    echo "📋 Check logs: docker-compose logs ml-worker"
    exit 1
fi

# Start Job Poller in background
echo "🔄 Starting Job Poller..."
./simple_poller.sh > poller.log 2>&1 &
POLLER_PID=$!
echo "✅ Job Poller started (PID: $POLLER_PID)"

# Start Web Frontend
echo "🌐 Starting Web Frontend..."
cd apps/web
pnpm dev > ../../web.log 2>&1 &
WEB_PID=$!
cd ../..
echo "✅ Web Frontend started (PID: $WEB_PID)"

echo ""
echo "✅ All systems started!"
echo ""
echo "📍 Services:"
echo "   - ML Worker: http://localhost:8080"
echo "   - Web Frontend: http://localhost:3000"
echo "   - Job Poller: Running (PID: $POLLER_PID)"
echo ""
echo "📋 Logs:"
echo "   - ML Worker: docker-compose logs -f ml-worker"
echo "   - Job Poller: tail -f poller.log"
echo "   - Web Frontend: tail -f web.log"
echo ""
echo "🛑 To stop all services: ./stop_all.sh"
echo ""

# Save PIDs for stop script
echo "$POLLER_PID" > .poller.pid
echo "$WEB_PID" > .web.pid
