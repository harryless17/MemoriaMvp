#!/bin/bash

echo "🛑 Arrêt complet du système..."

# Arrêter le worker Docker
echo "  - Arrêt du worker ML..."
docker-compose down

# Arrêter le frontend
echo "  - Arrêt du frontend..."
pkill -f "pnpm dev"
pkill -f "next dev"

echo ""
echo "✅ Système complètement arrêté !"

