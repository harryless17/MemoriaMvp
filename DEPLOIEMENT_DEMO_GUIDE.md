# 🚀 Guide de Déploiement Demo - Memoria MVP

## 🎯 Objectif
Déployer Memoria pour une démonstration avec des testeurs externes, avec un coût minimal et une mise en place rapide.

## 📋 Architecture Recommandée

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   Mobile App    │    │   ML Worker     │
│   (Vercel)      │    │   (Expo EAS)    │    │   (Railway)     │
│   Gratuit       │    │   Gratuit       │    │   Gratuit       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │   (Backend)     │
                    │   Gratuit       │
                    └─────────────────┘
```

## ⏱️ Temps estimé : 2-3 heures

---

## 🛠️ Étape 1 : Préparation du Projet

### 1.1 Vérifier les prérequis
```bash
# Vérifier Node.js
node --version  # >= 20.0.0

# Vérifier pnpm
pnpm --version  # >= 8.0.0

# Vérifier Docker (pour ML worker)
docker --version
```

### 1.2 Nettoyer le projet
```bash
# Dans le répertoire racine
pnpm clean
pnpm install
pnpm type-check
pnpm lint
```

---

## 🗄️ Étape 2 : Configuration Supabase

### 2.1 Créer un projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir une région proche (Europe West)
4. Attendre la création (2-3 minutes)

### 2.2 Configurer la base de données
1. Aller dans **SQL Editor**
2. Exécuter dans l'ordre :
   ```sql
   -- 1. Schema principal
   -- Copier le contenu de infra/supabase/schema.sql
   
   -- 2. Politiques RLS
   -- Copier le contenu de infra/supabase/policies.sql
   
   -- 3. Données de test (optionnel)
   -- Copier le contenu de infra/supabase/seed.sql
   ```

### 2.3 Configurer le Storage
1. Aller dans **Storage**
2. Créer un bucket : `media`
3. Rendre le bucket **Public**
4. Appliquer les politiques de storage

### 2.4 Configurer l'authentification
1. Aller dans **Authentication > Settings**
2. Activer **Email** provider
3. Configurer **Google OAuth** (optionnel) :
   - Aller sur [Google Cloud Console](https://console.cloud.google.com)
   - Créer un projet OAuth
   - Ajouter les URLs de redirection :
     - `https://your-project.supabase.co/auth/v1/callback`
     - `https://your-vercel-app.vercel.app/auth/callback`

### 2.5 Activer Realtime (optionnel)
1. Aller dans **Database > Replication**
2. Activer pour : `media`, `comments`, `likes`

### 2.6 Récupérer les clés
1. Aller dans **Settings > API**
2. Noter :
   - **Project URL** : `https://xxx.supabase.co`
   - **Anon Key** : `eyJ...`

---

## 🌐 Étape 3 : Déploiement Web App (Vercel)

### 3.1 Préparer le projet
```bash
cd apps/web

# Créer .env.local pour la production
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
EOF
```

### 3.2 Déployer sur Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. **Import Project** → Sélectionner votre repo
4. Configurer :
   - **Framework Preset** : Next.js
   - **Root Directory** : `apps/web`
   - **Build Command** : `cd apps/web && pnpm build`
   - **Output Directory** : `.next`
5. Ajouter les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
6. **Deploy**

### 3.3 Configurer le domaine personnalisé (optionnel)
1. Dans Vercel Dashboard → Settings → Domains
2. Ajouter un domaine personnalisé
3. Configurer les DNS

---

## 📱 Étape 4 : Déploiement Mobile App (Expo EAS)

### 4.1 Configurer EAS
```bash
cd apps/mobile

# Installer EAS CLI
npm install -g @expo/eas-cli

# Se connecter à Expo
eas login

# Configurer le projet
eas build:configure
```

### 4.2 Mettre à jour eas.json
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

### 4.3 Créer les builds
```bash
# Build Android (APK pour testeurs)
eas build --platform android --profile preview

# Build iOS (pour TestFlight)
eas build --platform ios --profile production
```

### 4.4 Distribuer aux testeurs
1. **Android** : Partager le lien de téléchargement APK
2. **iOS** : Soumettre à TestFlight via EAS Submit

---

## 🤖 Étape 5 : Déploiement ML Worker (Railway)

### 5.1 Préparer le worker
```bash
cd worker

# Créer .env pour Railway
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_URL=https://your-worker.railway.app
CLUSTER_EPSILON=0.55
MIN_CLUSTER_SIZE=2
EOF
```

### 5.2 Déployer sur Railway
1. Aller sur [railway.app](https://railway.app)
2. Se connecter avec GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Sélectionner votre repo
5. Configurer :
   - **Root Directory** : `worker`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Ajouter les variables d'environnement
7. **Deploy**

### 5.3 Alternative : Render
Si Railway ne fonctionne pas :
1. Aller sur [render.com](https://render.com)
2. **New** → **Web Service**
3. Connecter GitHub repo
4. Configurer :
   - **Root Directory** : `worker`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 🔗 Étape 6 : Configuration des URLs

### 6.1 Mettre à jour Supabase
1. Aller dans **Settings > API**
2. Ajouter dans **Site URL** : `https://your-app.vercel.app`
3. Ajouter dans **Redirect URLs** :
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app`

### 6.2 Mettre à jour les Edge Functions
Si vous utilisez des Edge Functions Supabase :
1. Aller dans **Edge Functions**
2. Mettre à jour `ml-enqueue` avec la nouvelle URL du worker
3. Redéployer les fonctions

---

## 🧪 Étape 7 : Tests de Validation

### 7.1 Test Web App
1. Aller sur `https://your-app.vercel.app`
2. Tester :
   - ✅ Inscription/Connexion
   - ✅ Création d'événement
   - ✅ Upload de photos
   - ✅ Partage d'événement
   - ✅ Commentaires/Likes

### 7.2 Test Mobile App
1. Installer l'APK sur un appareil Android
2. Tester les mêmes fonctionnalités
3. Vérifier la synchronisation avec le web

### 7.3 Test ML Worker
1. Aller sur `https://your-worker.railway.app/health`
2. Vérifier que le worker répond
3. Tester l'analyse de photos dans l'app

---

## 📊 Étape 8 : Monitoring et Analytics

### 8.1 Monitoring Vercel
- Dashboard Vercel pour les métriques web
- Logs en temps réel
- Alertes de performance

### 8.2 Monitoring Supabase
- Dashboard Supabase pour la DB
- Métriques d'usage
- Logs d'authentification

### 8.3 Analytics (optionnel)
Ajouter Google Analytics ou PostHog :
```bash
# Dans apps/web
pnpm add @vercel/analytics
```

---

## 🚀 Étape 9 : Lancement avec Testeurs

### 9.1 Préparer la communication
- **URL Web** : `https://your-app.vercel.app`
- **APK Android** : Lien de téléchargement
- **Guide utilisateur** : Instructions basiques

### 9.2 Créer un formulaire de feedback
- Google Forms ou Typeform
- Questions sur l'expérience utilisateur
- Rapport de bugs

### 9.3 Planifier les mises à jour
- Corrections de bugs prioritaires
- Améliorations UX basées sur les retours
- Nouvelles fonctionnalités demandées

---

## 💰 Coûts Estimés

| Service | Coût/mois | Limite gratuite |
|---------|-----------|-----------------|
| **Vercel** | 0€ | 100GB bandwidth |
| **Supabase** | 0€ | 500MB DB, 1GB storage |
| **Railway** | 0€ | 500h runtime |
| **Expo EAS** | 0€ | 30 builds/mois |
| **Total** | **0€** | Parfait pour démo |

---

## 🔧 Troubleshooting

### Problème : Build Vercel échoue
```bash
# Vérifier les dépendances
cd apps/web
pnpm install
pnpm build
```

### Problème : ML Worker ne démarre pas
```bash
# Vérifier les logs Railway
# Vérifier les variables d'environnement
# Tester localement avec Docker
make up
```

### Problème : Mobile app ne se connecte pas
- Vérifier les variables d'environnement dans `eas.json`
- Vérifier les URLs de redirection Supabase
- Tester avec Expo Go en développement

---

## 🎉 Félicitations !

Votre application Memoria est maintenant déployée et prête pour vos testeurs !

**URLs importantes :**
- 🌐 **Web App** : `https://your-app.vercel.app`
- 📱 **Mobile APK** : Lien de téléchargement
- 🤖 **ML Worker** : `https://your-worker.railway.app`
- 🗄️ **Supabase Dashboard** : `https://supabase.com/dashboard`

**Prochaines étapes :**
1. Collecter les retours des testeurs
2. Corriger les bugs prioritaires
3. Améliorer l'UX basée sur les retours
4. Planifier la migration vers une solution plus robuste si nécessaire

---

## 📞 Support

En cas de problème :
1. Vérifier les logs dans chaque service
2. Consulter la documentation respective
3. Tester localement pour isoler le problème
4. Redéployer si nécessaire

**Bon déploiement ! 🚀**
