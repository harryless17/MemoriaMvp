# ✅ Refonte Memoria V2 - COMPLÈTE

## 🎉 Résumé

La refonte de Memoria vers son concept original est **complète** ! Le projet est maintenant centré sur son idée de base : **un système de distribution de médias basé sur l'identification de personnes dans les photos**.

---

## 📊 Ce qui a été fait

### ✅ Phase 1 : Nettoyage
- Suppression de toutes les fonctionnalités "réseau social"
- Retrait des composants : likes, comments, stories, albums, feed public
- Suppression des pages inutiles
- Page d'accueil redirige vers `/events` ou `/login`

### ✅ Phase 2 : Migration Base de données
- Nouveau schéma créé dans `infra/supabase/migration_v2.sql`
- Table `event_members` (remplace `event_attendees`) avec système de rôles
- Table `media_tags` pour l'identification de personnes (CORE)
- Vues utiles : `member_media_counts`, `untagged_media`, `event_stats`
- Fonctions SQL : `add_event_member()`, `tag_media_bulk()`, `can_tag_in_event()`
- Policies RLS complètes pour la sécurité

### ✅ Phase 3 : Types TypeScript
- Mise à jour des types dans `packages/ui/src/types.ts`
- Nouveaux types : `EventMember`, `MediaTag`, `EventWithStats`, etc.
- Suppression des types obsolètes

### ✅ Phase 4 : Interface de tagging (CŒUR DU SYSTÈME)
- `MediaSelector.tsx` : sélection multiple de médias avec preview
- `MemberSelector.tsx` : sélection multiple de personnes avec recherche
- Page `/events/[id]/tag` : interface complète de tagging en 2 colonnes
- Tagging en masse (plusieurs médias + plusieurs personnes)
- Filtres : Tous / Non taggués / Taggués

### ✅ Phase 5 : Système d'invitation
- API `/api/send-invitations` : envoi d'emails aux invités
- Template email HTML responsive avec compteur de photos
- Page `/invite/[token]` : onboarding avec création de compte
- Token unique et sécurisé par invité
- `SendInvitationsDialog.tsx` : interface pour envoyer les invitations
- Auto-liaison du compte créé à l'événement

### ✅ Phase 6 : Navigation restructurée
- Page `/events` : "Mes événements" avec filtres (Tous / Organisés / Participant)
- Badges de rôle (Owner, Co-org, Participant)
- Vue adaptée selon le rôle :
  - **Organisateur** : voit tous les médias, membres, stats, non taggués
  - **Participant** : voit uniquement SES médias taggués
- Page `/events/new` : création d'événement simplifiée
- Page `/e/[id]` : détail événement avec vue conditionnelle

### ✅ Phase 7 : Export et téléchargement
- API `/api/export` : génération de ZIP des médias
- `DownloadButton.tsx` : bouton de téléchargement avec progress
- Export par membre (pour organisateurs)
- Export de tous les médias de l'événement
- Export de ses médias taggués (pour participants)

### ✅ Phase 8 : Notifications (simplifié)
- `NotificationBell.tsx` : composant de base pour notifications futures
- Structure prête pour l'extension

### ✅ Phase 9 : Documentation
- `MIGRATION_V2_README.md` : guide complet de migration SQL
- Ce document récapitulatif

---

## 🚀 Comment déployer

### Étape 1 : Migration de la base de données

1. **Backup OBLIGATOIRE** :
```bash
# Via Supabase dashboard : Database > Backups > Create backup
# Ou via CLI :
supabase db dump > backup_$(date +%Y%m%d).sql
```

2. **Exécuter la migration** :
   - Ouvrir le SQL Editor dans Supabase Dashboard
   - Copier tout le contenu de `infra/supabase/migration_v2.sql`
   - Exécuter le script
   - Vérifier qu'il n'y a pas d'erreurs

3. **Vérifier** :
```sql
-- Vérifier les tables
SELECT COUNT(*) FROM event_members;
SELECT COUNT(*) FROM media_tags;

-- Vérifier les vues
SELECT * FROM event_stats LIMIT 5;

-- Vérifier les policies RLS
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('event_members', 'media_tags');
```

### Étape 2 : Configuration des variables d'environnement

Ajouter dans `apps/web/.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Étape 3 : Installation et build

```bash
# Installer les dépendances
pnpm install

# Build
pnpm build

# Ou lancer en dev
pnpm dev:web
```

### Étape 4 : Déployer sur Vercel

1. Connecter le repo à Vercel
2. Set Root Directory : `apps/web`
3. Ajouter les variables d'environnement
4. Déployer

---

## 📖 Guide d'utilisation

### Pour un Organisateur

1. **Créer un événement**
   - Aller sur `/events`
   - Cliquer "Créer un événement"
   - Remplir titre, description, date, lieu

2. **Ajouter des membres**
   - Aller dans l'événement
   - Cliquer "Ajouter" dans la section Membres
   - Entrer nom + email de chaque invité
   - Possibilité de désigner des co-organisateurs

3. **Uploader des médias**
   - Cliquer "Uploader"
   - Sélectionner photos/vidéos (jusqu'à 50MB par fichier)
   - Les médias sont uploadés dans Supabase Storage

4. **Taguer des personnes** (ESSENTIEL !)
   - Cliquer "Taguer" dans l'événement
   - **Option A** : Sélectionner plusieurs médias + cocher les personnes
   - **Option B** : Utiliser les filtres "Non taggués" pour traiter rapidement
   - Cliquer "Taguer X médias avec Y personnes"

5. **Envoyer les invitations**
   - Une fois les médias taggués
   - Cliquer "Envoyer invitations"
   - Sélectionner les personnes (pré-sélection automatique des non-invités)
   - Les invités reçoivent un email avec lien unique

6. **Exporter**
   - Télécharger tous les médias de l'événement (ZIP)
   - Télécharger les médias d'une personne spécifique

### Pour un Participant

1. **Recevoir l'invitation**
   - Email : "Vous avez X photos de [Événement]"
   - Cliquer sur "Voir mes photos"

2. **Créer son compte**
   - Nom (pré-rempli)
   - Email (pré-rempli, non modifiable)
   - Mot de passe
   - Cliquer "Créer mon compte"

3. **Accéder à ses photos**
   - Redirection automatique vers l'événement
   - Voir uniquement SES photos (où il/elle est taggué(e))
   - Possibilité d'uploader ses propres photos

4. **Télécharger**
   - Cliquer "Télécharger mes photos"
   - Reçoit un ZIP avec toutes ses photos

### Pour un Co-organisateur

- Mêmes droits qu'un organisateur SAUF :
  - Ne peut pas supprimer l'événement
  - Ne peut pas retirer le owner

---

## 🎯 Workflow complet (exemple)

### Scénario : Mariage de Marie & Jean

1. **Jean crée l'événement** "Mariage Marie & Jean"
   - Date : 15 juin 2025
   - Lieu : Château de Versailles
   
2. **Jean ajoute 50 invités**
   - Pierre Dupont (pierre@email.com)
   - Sophie Martin (sophie@email.com)
   - ...
   
3. **Jean uploade 500 photos** du mariage

4. **Jean tague les photos**
   - Photo 1-25 : tague Marie, Jean, Pierre
   - Photo 26-50 : tague Sophie, Jean
   - Photo 51-100 : tague Marie, Pierre, Sophie
   - etc.
   
5. **Jean clique "Envoyer invitations"**
   - Tous les 50 invités reçoivent un email
   
6. **Pierre ouvre son email**
   - "Vous avez 120 photos du Mariage Marie & Jean"
   - Clique sur le lien
   
7. **Pierre crée son compte**
   - Nom : Pierre Dupont (pré-rempli)
   - Email : pierre@email.com (bloqué)
   - Mot de passe : ••••••••
   
8. **Pierre voit ses 120 photos**
   - Seulement les photos où il est identifié
   - Peut télécharger le tout en ZIP
   - Peut uploader ses propres photos du mariage

---

## 🔒 Sécurité et Permissions

### Row Level Security (RLS)

Toutes les tables ont des policies RLS strictes :

**event_members :**
- Owner/co-org voient tous les membres
- Participant ne voit que lui-même

**media :**
- Owner/co-org voient tous les médias
- Participant voit uniquement les médias où il est taggué
- Chacun voit les médias qu'il a uploadés

**media_tags :**
- Owner/co-org peuvent taguer et voir tous les tags
- Participant voit uniquement ses propres tags

### Storage

- Bucket `media` en public (URLs signées non implémentées pour l'instant)
- Chaque user peut uploader dans son dossier uniquement
- RLS sur la table `media` contrôle l'accès

---

## ⚠️ Points d'attention

### Données perdues lors de la migration
- ❌ Tous les likes
- ❌ Tous les commentaires
- ❌ Toutes les stories
- ❌ Tous les albums
- ✅ Tous les médias sont conservés (mais non taggués)

### Médias existants
Les médias existants ne seront pas visibles par les participants tant qu'ils ne sont pas taggués. **Action requise** : taguer les médias existants après la migration.

### Emails en développement
L'API d'envoi d'emails est configurée mais :
- En dev : les emails sont loggés dans la console
- En prod : configurer `RESEND_API_KEY` pour l'envoi réel

### Limitations actuelles
- Pas d'import CSV de membres (à ajouter plus tard)
- Pas de preview photos dans les emails (simplifié)
- Notifications basiques (à étendre)
- Pas de signed URLs pour les médias privés (public pour l'instant)

---

## 🔧 Améliorations futures (optionnelles)

### Court terme
- [ ] Import CSV de liste d'invités
- [ ] Preview de 3-4 photos dans l'email d'invitation
- [ ] Signed URLs pour médias vraiment privés
- [ ] Système de notifications push

### Moyen terme
- [ ] Reconnaissance faciale automatique (ML)
- [ ] App mobile native (React Native / Expo)
- [ ] Albums intelligents
- [ ] Partage sur réseaux sociaux

### Long terme
- [ ] Marketplace de photographes
- [ ] Édition de photos en ligne
- [ ] Impressions et livres photo
- [ ] Intégrations (Google Photos, iCloud, etc.)

---

## 🆘 Troubleshooting

### Erreur : "Permission denied" sur les médias
**Solution** : Vérifier les policies RLS avec :
```sql
SELECT * FROM pg_policies WHERE tablename = 'media';
```

### Erreur : "Function tag_media_bulk does not exist"
**Solution** : Réexécuter `migration_v2.sql`, la fonction n'a pas été créée

### Les invités ne voient pas leurs photos
**Solution** : 
1. Vérifier qu'ils sont bien taggués : 
```sql
SELECT * FROM media_tags WHERE member_id = 'member-uuid';
```
2. Vérifier qu'ils ont bien `joined_at` rempli dans `event_members`

### Email d'invitation non reçu
**Solution** : 
- En dev, regarder la console du serveur
- En prod, vérifier que `RESEND_API_KEY` est configuré
- Vérifier les logs de l'API `/api/send-invitations`

---

## 📞 Support

En cas de problème :
1. Consulter les logs Supabase Dashboard
2. Vérifier les RLS policies
3. Tester en local avec `pnpm dev:web`
4. Consulter `MIGRATION_V2_README.md` pour détails SQL

---

## ✨ Conclusion

**Memoria V2 est maintenant aligné avec ton idée originale !**

Le système permet de :
- ✅ Créer des événements
- ✅ Uploader des médias
- ✅ Identifier les personnes dans chaque média
- ✅ Distribuer automatiquement les photos à chaque personne
- ✅ Inviter par email avec onboarding
- ✅ Télécharger facilement ses photos

**La plateforme est prête pour une utilisation réelle !**

Prochaine étape : **Tester avec un vrai événement** et ajuster si nécessaire.

---

Bon courage avec le déploiement ! 🚀
