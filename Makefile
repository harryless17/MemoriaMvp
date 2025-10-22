.PHONY: up down restart logs logs-worker logs-poller logs-frontend build status clean clean-jobs help up-all down-all

# 🚀 Démarrer uniquement le système ML (sans frontend)
up:
	@echo "🚀 Démarrage du système ML..."
	docker-compose up -d --build
	@echo "⏳ Attente du démarrage du worker (20s)..."
	@sleep 20
	@echo "✅ Worker ML démarré !"
	@echo ""
	@echo "📍 Worker ML : http://localhost:8080"
	@echo ""
	@echo "💡 Pour démarrer TOUT (ML + Frontend) : make up-all"
	@echo "💡 Commandes utiles :"
	@echo "   make logs        - Voir tous les logs"
	@echo "   make logs-worker - Voir uniquement les logs du worker"
	@echo "   make down        - Arrêter le système"
	@echo "   make restart     - Redémarrer le système"

# 🚀 Démarrer TOUT le système (ML + Frontend)
up-all:
	@echo "🧹 Nettoyage..."
	-@docker-compose down 2>/dev/null
	-@pkill -f "pnpm dev" 2>/dev/null
	-@pkill -f "next dev" 2>/dev/null
	@echo ""
	@echo "🚀 Démarrage du worker ML..."
	@docker-compose up -d --build
	@echo "⏳ Attente du worker (20s)..."
	@sleep 20
	@echo ""
	@echo "🌐 Démarrage du frontend..."
	@cd apps/web && pnpm dev > ../../frontend.log 2>&1 & echo $$! > ../../.frontend.pid
	@echo "⏳ Attente du frontend (10s)..."
	@sleep 10
	@echo ""
	@echo "✅ Système complet démarré !"
	@echo ""
	@echo "📍 Frontend : http://localhost:3000"
	@echo "📍 Worker ML : http://localhost:8080"
	@echo ""
	@echo "📋 Logs :"
	@echo "   make logs-worker   - Logs du worker"
	@echo "   make logs-frontend - Logs du frontend"
	@echo ""
	@echo "🛑 Pour arrêter : make down-all"

# 🛑 Arrêter uniquement le worker ML
down:
	@echo "🛑 Arrêt du worker ML..."
	docker-compose down
	@echo "✅ Worker ML arrêté !"

# 🛑 Arrêter TOUT (ML + Frontend)
down-all:
	@echo "🛑 Arrêt complet du système..."
	@echo "  - Arrêt du worker ML..."
	-@docker-compose down 2>/dev/null
	@echo "  - Arrêt du frontend Next.js..."
	-@pkill -9 -f "pnpm dev" 2>/dev/null
	-@pkill -9 -f "next dev" 2>/dev/null
	-@pkill -9 -f "next-server" 2>/dev/null
	-@pkill -9 -f "node.*next" 2>/dev/null
	@echo "  - Nettoyage des fichiers temporaires..."
	-@rm -f .frontend.pid frontend.log 2>/dev/null
	@echo ""
	@echo "✅ Système complètement arrêté !"
	@echo ""
	@echo "📊 Vérification (devrait être vide) :"
	-@ps aux | grep -E "pnpm|next-server" | grep -v grep | grep -v cursor || echo "  ✅ Aucun processus résiduel détecté"

# 🔄 Redémarrer le système
restart: down up

# 📋 Voir tous les logs
logs:
	docker-compose logs -f

# 📋 Voir uniquement les logs du worker
logs-worker:
	docker-compose logs -f ml-worker

# 📋 Voir les logs du poller
logs-poller:
	docker-compose logs -f ml-worker | grep -E "(pending jobs|Processing job|completed)"

# 📋 Voir les logs du frontend
logs-frontend:
	@tail -f frontend.log 2>/dev/null || echo "❌ Frontend pas démarré (lance 'make up-all')"

# 🔨 Rebuild sans cache
build:
	@echo "🔨 Rebuild complet du système..."
	docker-compose build --no-cache
	@echo "✅ Rebuild terminé !"

# 📊 Status du système
status:
	@echo "📊 Status du système :"
	@docker-compose ps

# 🧹 Nettoyer les containers et images
clean:
	@echo "🧹 Nettoyage..."
	docker-compose down -v
	docker system prune -f
	@pkill -f "pnpm dev" 2>/dev/null || true
	@rm -f .frontend.pid frontend.log
	@echo "✅ Nettoyage terminé !"

# 🧹 Nettoyer les vieux jobs ML dans Supabase
clean-jobs:
	@echo "📋 SQL à exécuter dans Supabase :"
	@echo ""
	@cat clean_old_jobs.sql
	@echo ""
	@echo "⚠️  Copie ce SQL et exécute-le dans l'éditeur SQL de Supabase"

# 🧹 Nettoyer les jobs detect obsolètes
clean-detect-jobs:
	@echo "📋 SQL pour nettoyer les jobs detect obsolètes :"
	@echo ""
	@cat cleanup_detect_jobs.sql
	@echo ""
	@echo "⚠️  Copie ce SQL et exécute-le dans l'éditeur SQL de Supabase"

# 🎯 Tester le clustering (après avoir cliqué sur "Analyser les photos")
test-tags:
	@echo "🔍 Vérification des tags créés..."
	@docker-compose logs --tail 50 ml-worker | grep -E "(Created tag|Failed to create|Found.*linked clusters|Cluster.*faces)" || echo "Aucun tag trouvé dans les logs récents"

# ℹ️ Aide
help:
	@echo "📖 Commandes disponibles :"
	@echo ""
	@echo "🚀 DÉMARRAGE :"
	@echo "  make up-all       - Démarrer TOUT (ML + Frontend)"
	@echo "  make up           - Démarrer uniquement le worker ML"
	@echo ""
	@echo "🛑 ARRÊT :"
	@echo "  make down-all     - Arrêter TOUT"
	@echo "  make down         - Arrêter uniquement le worker ML"
	@echo ""
	@echo "📋 LOGS :"
	@echo "  make logs         - Tous les logs"
	@echo "  make logs-worker  - Logs du worker ML"
	@echo "  make logs-frontend- Logs du frontend"
	@echo "  make logs-poller  - Logs du poller"
	@echo ""
	@echo "🔧 MAINTENANCE :"
	@echo "  make restart           - Redémarrer le worker"
	@echo "  make build             - Rebuild complet"
	@echo "  make status            - Status des containers"
	@echo "  make clean             - Nettoyer tout"
	@echo "  make clean-jobs        - SQL pour nettoyer les vieux jobs"
	@echo "  make clean-detect-jobs - SQL pour nettoyer les jobs detect obsolètes"
	@echo ""
	@echo "🎯 TEST :"
	@echo "  make test-tags    - Vérifier les tags créés"
	@echo ""

# Par défaut, afficher l'aide
.DEFAULT_GOAL := help

