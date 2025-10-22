#!/bin/bash

echo "🚀 Starting ML System (Worker + Poller)..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start
echo "🔨 Building and starting ML system..."
docker-compose up --build -d

# Wait for health check
echo "⏳ Waiting for system to be ready..."
sleep 10

# Check health
echo "🔍 Checking system health..."
curl -f http://localhost:8080/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ ML System is ready!"
    echo "📍 Worker: http://localhost:8080"
    echo "📍 Health: http://localhost:8080/health"
    echo ""
    echo "🔄 Job Poller is running automatically"
    echo "📋 Check logs: docker-compose logs -f ml-worker"
else
    echo "❌ ML System failed to start"
    echo "📋 Check logs: docker-compose logs ml-worker"
    exit 1
fi
