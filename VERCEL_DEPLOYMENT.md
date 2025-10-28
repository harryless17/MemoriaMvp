# Configuration Vercel pour Memoria MVP

## Variables d'environnement requises

Créez ces variables dans votre dashboard Vercel :

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

## Instructions de déploiement

1. **Connecter le repository** :
   - Aller sur [vercel.com](https://vercel.com)
   - Se connecter avec GitHub
   - Cliquer sur "Import Project"
   - Sélectionner votre repository MemoriaMvp

2. **Configurer le projet** :
   - **Framework Preset** : Next.js
   - **Root Directory** : `apps/web`
   - **Build Command** : `cd apps/web && pnpm build`
   - **Output Directory** : `.next`

3. **Ajouter les variables d'environnement** :
   - Dans l'onglet "Environment Variables"
   - Ajouter les 3 variables ci-dessus

4. **Déployer** :
   - Cliquer sur "Deploy"
   - Attendre la fin du déploiement

## URLs importantes après déploiement

- **App** : `https://your-app-name.vercel.app`
- **Dashboard Vercel** : `https://vercel.com/dashboard`
- **Logs** : Dans le dashboard Vercel → Functions → Logs
