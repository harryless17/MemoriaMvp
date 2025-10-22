# ✅ Checklist de déploiement - Memoria V2

## Avant de commencer

- [ ] J'ai lu `REFONTE_V2_COMPLETE.md`
- [ ] J'ai lu `infra/supabase/MIGRATION_V2_README.md`
- [ ] J'ai un backup de ma base de données actuelle

---

## 1️⃣ Migration Base de données

- [ ] Connexion au Dashboard Supabase
- [ ] **Backup créé** (Database > Backups)
- [ ] SQL Editor ouvert
- [ ] Copié le contenu de `infra/supabase/migration_v2.sql`
- [ ] Script exécuté sans erreurs
- [ ] Vérification des tables :
  ```sql
  SELECT COUNT(*) FROM event_members;
  SELECT COUNT(*) FROM media_tags;
  ```
- [ ] Vérification des vues :
  ```sql
  SELECT * FROM event_stats LIMIT 5;
  ```
- [ ] Vérification des policies RLS :
  ```sql
  SELECT tablename, policyname FROM pg_policies 
  WHERE tablename IN ('event_members', 'media_tags', 'media');
  ```

---

## 2️⃣ Configuration environnement

### Fichier `apps/web/.env.local`

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configuré
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuré
- [ ] `NEXT_PUBLIC_APP_URL` configuré (ex: https://memoria.app)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configuré (pour les API routes)
- [ ] (Optionnel) `RESEND_API_KEY` si envoi d'emails en prod

---

## 3️⃣ Build et test local

- [ ] `pnpm install` exécuté
- [ ] `pnpm dev:web` démarre sans erreurs
- [ ] Test : créer un événement
- [ ] Test : ajouter un membre
- [ ] Test : uploader un média
- [ ] Test : taguer un média
- [ ] Test : envoyer invitation (regarder console pour l'URL du token)
- [ ] Test : ouvrir l'URL d'invitation
- [ ] Test : créer un compte invité
- [ ] Test : voir ses médias taggués en tant que participant
- [ ] Test : télécharger ses photos

---

## 4️⃣ Déploiement Vercel

- [ ] Repo connecté à Vercel
- [ ] Root Directory = `apps/web`
- [ ] Framework Preset = Next.js
- [ ] Variables d'environnement ajoutées :
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] (Optionnel) `RESEND_API_KEY`
- [ ] Build réussi
- [ ] Déploiement réussi
- [ ] URL de production accessible

---

## 5️⃣ Tests en production

### Test organisateur
- [ ] Se connecter
- [ ] Créer un événement
- [ ] Ajouter des membres (avec de vrais emails de test)
- [ ] Uploader des médias
- [ ] Taguer des médias
- [ ] Envoyer invitations

### Test participant
- [ ] Recevoir l'email d'invitation
- [ ] Cliquer sur le lien
- [ ] Créer un compte
- [ ] Voir ses médias taggués uniquement
- [ ] Uploader ses propres médias
- [ ] Télécharger ses photos en ZIP

### Test permissions
- [ ] Un participant ne voit PAS les médias des autres
- [ ] Un participant ne peut PAS taguer
- [ ] Un participant ne peut PAS ajouter de membres
- [ ] Un organisateur voit TOUS les médias
- [ ] Un co-organisateur peut taguer

---

## 6️⃣ Configuration emails (optionnel mais recommandé)

Si vous voulez envoyer de vrais emails :

### Option A : Resend (recommandé)
- [ ] Compte créé sur [resend.com](https://resend.com)
- [ ] API Key généré
- [ ] Ajouté dans variables d'environnement
- [ ] Domaine vérifié (pour production)
- [ ] Test d'envoi d'email

### Option B : SendGrid
- [ ] Compte créé
- [ ] API Key généré
- [ ] Code API modifié pour utiliser SendGrid
- [ ] Test d'envoi

---

## 7️⃣ Monitoring et maintenance

- [ ] Logs Vercel configurés
- [ ] Logs Supabase surveillés
- [ ] Backup automatique Supabase activé
- [ ] Limites Supabase vérifiées (Storage, Database)
- [ ] Plan de mise à l'échelle si croissance

---

## 8️⃣ Documentation utilisateur

- [ ] Guide utilisateur partagé avec les premiers utilisateurs
- [ ] FAQ créée
- [ ] Support email/contact configuré

---

## ⚠️ En cas de problème

### Rollback base de données
```bash
# Restaurer le backup
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

### Rollback déploiement Vercel
1. Aller dans Vercel Dashboard
2. Deployments
3. Cliquer sur le déploiement précédent
4. "Promote to Production"

### Support
- Consulter `REFONTE_V2_COMPLETE.md` section Troubleshooting
- Vérifier les logs Supabase
- Vérifier les logs Vercel
- Tester en local avec `pnpm dev:web`

---

## ✅ Déploiement réussi !

Une fois toutes les cases cochées, votre Memoria V2 est en production !

**Prochaines étapes :**
1. Inviter vos premiers utilisateurs
2. Collecter des retours
3. Itérer sur les fonctionnalités
4. Ajouter les améliorations futures (voir `REFONTE_V2_COMPLETE.md`)

Bon lancement ! 🚀
