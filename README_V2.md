# Memoria V2 - Distribution intelligente de photos d'événements

> Identifiez les personnes dans vos photos et distribuez automatiquement à chaque invité ses médias personnalisés

## 🎯 Le problème résolu

Lors d'un événement (mariage, anniversaire, conférence) avec des centaines de photos et dizaines d'invités, comment distribuer efficacement les photos à chacun ?

**Avant :** 
- ❌ Envoyer toutes les 500 photos à tout le monde
- ❌ Envoyer manuellement chaque photo à la bonne personne
- ❌ Créer des albums par personne (fastidieux)

**Avec Memoria :**
- ✅ Uploader toutes les photos en une fois
- ✅ Identifier les personnes présentes sur chaque photo
- ✅ Chaque invité reçoit automatiquement SES photos

## ✨ Fonctionnalités

### Pour les Organisateurs
- 📸 **Upload en masse** : uploadez des centaines de photos/vidéos
- 🏷️ **Tagging intelligent** : identifiez facilement les personnes (sélection multiple)
- 📧 **Invitations automatiques** : envoi d'emails personnalisés avec compteur de photos
- 👥 **Gestion des membres** : ajoutez invités et co-organisateurs
- 📊 **Vue d'ensemble** : compteurs de médias, personnes, non-taggués
- 💾 **Export flexible** : téléchargez tout l'événement ou les photos d'une personne

### Pour les Participants
- 📩 **Invitation par email** : lien unique et sécurisé
- 🎁 **Découverte** : "Vous avez X photos qui vous attendent"
- 🔐 **Compte personnel** : création simple en un clic
- 🖼️ **Mes photos uniquement** : accès seulement aux médias où vous êtes identifié
- 📥 **Téléchargement facile** : récupérez toutes vos photos en un ZIP
- 📤 **Contribution** : uploadez vos propres photos de l'événement

## 🏗️ Architecture technique

### Monorepo Turborepo
```
MemoriaMvp/
├── apps/
│   └── web/              # Next.js 14 (App Router)
├── packages/
│   ├── ui/               # Types, schemas, utils partagés
│   └── config/           # Configs ESLint, Prettier, etc.
└── infra/
    └── supabase/         # Schema SQL, migrations, RLS policies
```

### Stack technique
- **Frontend** : Next.js 14, TypeScript, Tailwind CSS, Shadcn UI
- **Backend** : Supabase (PostgreSQL, Auth, Storage)
- **Sécurité** : Row Level Security (RLS)
- **Emails** : Resend (ou SendGrid)
- **Export** : JSZip pour génération de fichiers ZIP
- **Deploy** : Vercel (web)

## 🚀 Quick Start

### Prérequis
- Node.js >= 20
- pnpm >= 8
- Compte Supabase (gratuit)

### 1. Installation
```bash
git clone <repo-url> memoria-mvp
cd memoria-mvp
pnpm install
```

### 2. Configuration Supabase

#### Créer le projet
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter URL et Anon Key

#### Exécuter la migration
1. Ouvrir SQL Editor dans Supabase Dashboard
2. Copier le contenu de `infra/supabase/migration_v2.sql`
3. Exécuter

#### Créer le bucket storage
1. Storage > New bucket
2. Nom : `media`
3. Public : oui

### 3. Variables d'environnement

Créer `apps/web/.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Lancer
```bash
pnpm dev:web
# Ouvre http://localhost:3000
```

## 📖 Guide d'utilisation

### Scénario typique : Mariage

**1. L'organisateur crée l'événement "Mariage de Marie & Jean"**

**2. Ajoute 50 invités**
- Pierre Dupont (pierre@email.com)
- Sophie Martin (sophie@email.com)
- ...

**3. Uploade 500 photos du photographe**

**4. Tague les photos**
- Sélectionne photos 1-25 → coche Marie, Jean, Pierre
- Sélectionne photos 26-50 → coche Sophie, Jean
- Continue...

**5. Clique "Envoyer invitations"**

**6. Chaque invité reçoit :**
```
📧 Vous avez 120 photos de "Mariage Marie & Jean"

[Voir mes photos]
```

**7. L'invité crée son compte et voit SES 120 photos uniquement**

**8. Il peut télécharger tout en un clic (ZIP)**

## 🔐 Sécurité & Privacy

### Row Level Security (RLS)

Toutes les données sont protégées par des policies PostgreSQL :

**Médias :**
- ✅ Les organisateurs voient tous les médias
- ✅ Les participants voient UNIQUEMENT les médias où ils sont taggués
- ✅ Chacun voit ses propres uploads

**Membres :**
- ✅ Les organisateurs voient tous les membres
- ✅ Les participants ne voient qu'eux-mêmes

**Tags :**
- ✅ Seuls les organisateurs peuvent taguer
- ✅ Les participants voient leurs propres tags

### Authentification
- Email + mot de passe
- Google OAuth (optionnel)
- Tokens d'invitation uniques et sécurisés

## 📊 Modèle de données

```sql
events
├── id, title, description, date, location, owner_id

event_members (qui participe)
├── id, event_id, user_id, name, email
├── role ('owner' | 'co-organizer' | 'participant')
└── invitation_token, invitation_sent_at, joined_at

media (photos/vidéos)
├── id, event_id, uploaded_by
└── type, storage_path, created_at

media_tags (qui est sur quelle photo)
├── id, media_id, member_id
└── tagged_by, tagged_at
```

## 🎨 Interface

### Page "Mes événements"
- Filtres : Tous / Organisés par moi / J'y participe
- Badges de rôle (Organisateur, Co-org, Participant)
- Stats contextuelles selon le rôle

### Page "Tagging"
- 2 colonnes : Médias (gauche) + Personnes (droite)
- Sélection multiple des deux côtés
- Bouton flottant "Taguer X médias avec Y personnes"
- Filtres : Tous / Non taggués / Taggués

### Page "Événement"
- **Vue organisateur** : tous les médias, membres, warnings non-taggués
- **Vue participant** : uniquement ses médias taggués

## 🚀 Déploiement

### Vercel (recommandé)
```bash
# Configurer dans Vercel Dashboard :
# - Root Directory: apps/web
# - Framework: Next.js
# - Variables d'environnement (voir .env.local)

vercel --prod
```

### Checklist complète
Voir `CHECKLIST_DEPLOIEMENT.md` pour la procédure complète.

## 📝 Documentation complète

- `REFONTE_V2_COMPLETE.md` : Guide complet de la refonte
- `CHECKLIST_DEPLOIEMENT.md` : Checklist étape par étape
- `infra/supabase/MIGRATION_V2_README.md` : Détails migration SQL

## 🛠️ Développement

```bash
# Lancer le web en dev
pnpm dev:web

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build
pnpm build
```

## 🔮 Roadmap

### Court terme
- [ ] Import CSV de liste d'invités
- [ ] Preview photos dans emails
- [ ] Notifications push
- [ ] Signed URLs pour médias privés

### Moyen terme
- [ ] Reconnaissance faciale automatique (ML)
- [ ] App mobile native
- [ ] Partage sur réseaux sociaux

### Long terme
- [ ] Marketplace photographes
- [ ] Édition de photos en ligne
- [ ] Impressions et livres photo

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir `CONTRIBUTING.md`.

## 📄 Licence

MIT License - voir LICENSE

## 🙏 Remerciements

Construit avec ❤️ en utilisant :
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Turborepo](https://turbo.build/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Memoria V2** - Partagez les bons moments, simplement. 📸✨
