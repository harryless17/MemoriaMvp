#!/bin/bash

echo "🛑 Stopping Complete Memoria System..."
echo ""

# Stop Job Poller
if [ -f ".poller.pid" ]; then
    POLLER_PID=$(cat .poller.pid)
    if ps -p $POLLER_PID > /dev/null 2>&1; then
        echo "🛑 Stopping Job Poller (PID: $POLLER_PID)..."
        kill $POLLER_PID
        rm .poller.pid
        echo "✅ Job Poller stopped"
    fi
fi

# Stop Web Frontend
if [ -f ".web.pid" ]; then
    WEB_PID=$(cat .web.pid)
    if ps -p $WEB_PID > /dev/null 2>&1; then
        echo "🛑 Stopping Web Frontend (PID: $WEB_PID)..."
        kill $WEB_PID
        rm .web.pid
        echo "✅ Web Frontend stopped"
    fi
fi

# Stop ML Worker
echo "🛑 Stopping ML Worker..."
docker-compose down
echo "✅ ML Worker stopped"

echo ""
echo "✅ All services stopped!"
