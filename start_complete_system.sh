#!/bin/bash

echo "🧹 Nettoyage du système..."

# Arrêter tout
docker-compose down 2>/dev/null
pkill -f "pnpm dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null

echo ""
echo "⚠️  IMPORTANT: Avant de continuer, exécute ce SQL dans Supabase:"
echo ""
echo "================================================"
cat clean_old_jobs.sql
echo "================================================"
echo ""
read -p "Appuie sur ENTER une fois que tu as exécuté le SQL dans Supabase..."

echo ""
echo "🚀 Démarrage du système ML..."
docker-compose up -d --build

echo ""
echo "⏳ Attente du démarrage du worker (20s)..."
sleep 20

echo ""
echo "🌐 Démarrage du frontend Next.js..."
cd apps/web
pnpm dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo "⏳ Attente du démarrage du frontend (10s)..."
sleep 10

echo ""
echo "✅ Système complet démarré !"
echo ""
echo "📍 Frontend : http://localhost:3000"
echo "📍 Worker ML : http://localhost:8080"
echo ""
echo "📋 Logs disponibles :"
echo "   - Worker ML : docker-compose logs -f ml-worker"
echo "   - Frontend : tail -f frontend.log"
echo ""
echo "🛑 Pour arrêter :"
echo "   - make down (arrête le worker)"
echo "   - kill $FRONTEND_PID (arrête le frontend)"
echo "   - ou lance : ./stop_complete_system.sh"
echo ""
echo "🎯 Maintenant, va sur http://localhost:3000 et teste !"

