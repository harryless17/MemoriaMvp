# 🚀 Memoria ML System - Quick Start

## Commandes principales

### Démarrer tout le système
```bash
make up
```
Cette commande :
- Build le worker Docker
- Démarre le worker ML + poller automatique
- Attend 20s que tout soit prêt
- Affiche les URLs et commandes utiles

### Arrêter le système
```bash
make down
```

### Redémarrer (rebuild + restart)
```bash
make restart
```

### Voir les logs
```bash
# Tous les logs
make logs

# Uniquement le worker
make logs-worker

# Uniquement le poller
make logs-poller

# Tester les tags après clustering
make test-tags
```

### Autres commandes
```bash
# Status des containers
make status

# Rebuild complet sans cache
make build

# Nettoyer tout (containers + volumes)
make clean

# Afficher l'aide
make help
```

## 🎯 Workflow de test

1. **Démarrer le système** :
   ```bash
   make up
   ```

2. **Aller sur l'interface** :
   - Ouvre http://localhost:3000
   - Va sur un événement → Analyse

3. **Cliquer sur "Analyser les photos"**

4. **Voir les logs en temps réel** :
   ```bash
   make test-tags
   ```
   
   Tu devrais voir :
   - `Found X linked clusters, creating tags...`
   - `Cluster XXXXX: Y faces, linked_user_id: ZZZZZ`
   - `✅ Created tag for media XXXXX -> member YYYYY`

## 🔧 Troubleshooting

### Aucun tag créé ?
```bash
# Vérifier que le worker tourne
make status

# Voir les logs du worker
make logs-worker

# Redémarrer proprement
make restart
```

### Worker bloqué ?
```bash
# Redémarrer
make restart

# Ou nettoyer complètement
make clean
make up
```

## 📚 Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│ Edge Function   │
│  ml-enqueue     │
└────────┬────────┘
         │ Creates job
         ↓
┌─────────────────┐
│   Supabase      │
│   ml_jobs       │
└────────┬────────┘
         │ Polled by
         ↓
┌─────────────────┐
│  Job Poller     │
│  (Python)       │
└────────┬────────┘
         │ Triggers
         ↓
┌─────────────────┐
│  ML Worker      │
│  (FastAPI)      │
└─────────────────┘
```

## 🎉 C'est tout !

Le système est maintenant **complètement automatique** :
- ✅ Le poller surveille les jobs en permanence
- ✅ Le worker détecte et clustérise les visages
- ✅ Les tags sont créés automatiquement pour les clusters liés
- ✅ Le frontend affiche les personas et les photos

**Il suffit de cliquer sur "Analyser les photos" et tout se fait automatiquement !** 🚀
