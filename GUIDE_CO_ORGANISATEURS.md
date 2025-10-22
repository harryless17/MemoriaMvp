# 👥 Guide : Gestion des Co-organisateurs

## 📋 Vue d'ensemble

Dans Memoria V2, il existe **3 rôles** pour les membres d'un événement :

| Rôle | Badge | Permissions |
|------|-------|-------------|
| **Organisateur** (Owner) | 👑 Jaune | Tous les droits (créateur de l'événement) |
| **Co-organisateur** | 👑 Bleu | Taguer, voir tous les médias, gérer membres |
| **Participant** | 👥 Vert | Voir ses médias taggués, uploader |

---

## ✨ Comment ajouter un Co-organisateur

### Méthode 1 : Lors de l'ajout d'un nouveau membre

1. Cliquer sur **"Ajouter"** dans la section Membres
2. Entrer **nom** et **email**
3. Sélectionner le rôle **"Co-organisateur"** au lieu de "Participant"
4. Cliquer **"Ajouter"**

**Interface :**
```
┌─────────────────────────────────────┐
│ Ajouter un membre                   │
├─────────────────────────────────────┤
│ Nom: Pierre Dupont                  │
│ Email: pierre@example.com           │
│                                     │
│ Rôle:                               │
│ ○ Participant                       │
│   Voit ses médias, peut uploader    │
│                                     │
│ ● Co-organisateur                   │
│   Peut taguer, gérer, voir tout     │
│                                     │
│         [Annuler]  [Ajouter]        │
└─────────────────────────────────────┘
```

### Méthode 2 : Promouvoir un membre existant

1. Aller dans la **section Membres** de l'événement
2. Trouver le participant à promouvoir
3. Cliquer sur l'icône **↑** (flèche vers le haut)
4. Confirmer la promotion

**Avant :**
```
👤 Marie Dupont
   marie@example.com
   👥 Participant - Inscrit
   [↑] [🗑️]
```

**Après :**
```
👤 Marie Dupont
   marie@example.com
   👑 Co-org - Inscrit
   [↓] [🗑️]
```

### Méthode 3 : Rétrograder un co-organisateur

1. Cliquer sur l'icône **↓** (flèche vers le bas)
2. Confirmer la rétrogradation
3. Il redevient participant

---

## 🔐 Permissions détaillées

### 👑 Organisateur (Owner)
- ✅ Créer l'événement
- ✅ Ajouter/retirer des membres
- ✅ Promouvoir/rétrograder des membres
- ✅ Taguer des médias
- ✅ Envoyer des invitations
- ✅ Voir tous les médias
- ✅ Voir tous les membres
- ✅ Éditer l'événement
- ✅ Supprimer l'événement
- ✅ Exporter tout
- ✅ Uploader des médias

### 👑 Co-organisateur
- ✅ Taguer des médias
- ✅ Voir tous les médias
- ✅ Voir tous les membres
- ✅ Envoyer des invitations
- ✅ Exporter tout
- ✅ Uploader des médias
- ❌ Ajouter/retirer des membres (réservé au owner)
- ❌ Promouvoir d'autres membres
- ❌ Éditer/supprimer l'événement

### 👥 Participant
- ✅ Voir SES médias taggués uniquement
- ✅ Uploader ses propres photos
- ✅ Télécharger ses photos
- ❌ Voir les médias des autres
- ❌ Taguer des personnes
- ❌ Voir tous les membres
- ❌ Gérer l'événement

---

## 💡 Cas d'usage

### Exemple 1 : Mariage avec photographe

**Organisateur :** Marie (mariée)
- Crée l'événement
- Ajoute tous les invités

**Co-organisateur :** Jean (photographe professionnel)
- Uploade les 500 photos
- Tague les personnes
- Envoie les invitations

**Avantage :** Marie délègue le travail de tagging au photographe qui connaît bien les photos.

---

### Exemple 2 : Événement d'entreprise

**Organisateur :** Sophie (RH)
- Crée l'événement "Séminaire 2025"
- Ajoute tous les employés

**Co-organisateurs :** Pierre et Luc (équipe communication)
- Uploadent les photos
- Taguent les équipes
- Gèrent la distribution

**Avantage :** Travail collaboratif, plusieurs personnes peuvent taguer en même temps.

---

### Exemple 3 : Anniversaire

**Organisateur :** Papa
- Crée "Anniversaire de Lucas (10 ans)"

**Co-organisateur :** Maman
- Aide à taguer les enfants
- Envoie les invitations aux parents

**Participants :** Les autres parents
- Voient uniquement les photos de leurs enfants
- Uploadent leurs propres photos

---

## 🎨 Interface visuelle

### Badge dans la liste des événements

```
┌──────────────────────────────────┐
│ 👑 Organisateur                  │
│ Mariage Marie & Jean             │
│ 500 médias • 50 membres          │
│ ⚠️ 120 non taggués               │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 👑 Co-organisateur               │
│ Séminaire Entreprise 2025        │
│ 200 médias • 30 membres          │
│ ⚠️ 5 non taggués                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 👥 Participant                   │
│ Mariage Marie & Jean             │
│ 45 photos de vous                │
└──────────────────────────────────┘
```

### Dans la liste des membres

```
Membres (52)  [Ajouter] [Envoyer invitations]

👤 Marie Dupont
   marie@email.com
   👑 Organisateur - Inscrit

👤 Jean Martin
   jean@email.com
   👑 Co-org - Inscrit
   [↓] [🗑️]

👤 Pierre Durand
   pierre@email.com
   👥 Participant - Invitation envoyée
   [↑] [🗑️]
```

**Actions :**
- **↑** = Promouvoir en co-organisateur
- **↓** = Rétrograder en participant
- **🗑️** = Retirer du membre

---

## 🔄 Workflow recommandé

### Pour un grand événement (500+ photos)

1. **Créer l'événement** (Owner)
2. **Ajouter un co-organisateur** (photographe, assistant)
3. **Ajouter tous les participants** (liste invités)
4. **Uploader les médias** (Owner + Co-org en parallèle)
5. **Taguer en collaboration** (Owner et Co-org se partagent le travail)
6. **Envoyer les invitations** (Owner ou Co-org)

**Gain de temps :** 2 personnes peuvent taguer simultanément !

---

## ⚠️ Limites actuelles

### Ce que les co-organisateurs NE PEUVENT PAS faire :

1. **Ajouter/retirer des membres** (réservé au owner)
   - Raison : éviter les conflits de gestion
   - Solution future : permettre via API avec validation

2. **Promouvoir d'autres membres** (réservé au owner)
   - Raison : seul le créateur désigne les co-organisateurs
   
3. **Supprimer l'événement** (réservé au owner)
   - Raison : protection contre suppressions accidentelles

### Pourquoi ces limites ?

Pour garder une **hiérarchie claire** :
- 1 seul Owner (créateur)
- N co-organisateurs (délégués de confiance)
- M participants (invités)

---

## 🔮 Améliorations futures possibles

### Court terme
- [ ] Co-org peut ajouter des membres (avec permission owner)
- [ ] Historique des actions (qui a taggué quoi)
- [ ] Notifications quand un co-org tague

### Moyen terme
- [ ] Chat entre organisateurs
- [ ] Assignation de tâches (ex: "Pierre, tague les photos 1-100")
- [ ] Statistiques par co-organisateur

---

## ✅ Résumé

**Fonctionnalité implémentée :**
- ✅ Ajouter un membre comme co-organisateur
- ✅ Promouvoir un participant en co-organisateur
- ✅ Rétrograder un co-organisateur en participant
- ✅ Badges visuels pour différencier les rôles
- ✅ Permissions correctes (tagging, vue, export)

**Le système de co-organisateurs est opérationnel !** 👏

---

**Tu peux maintenant tester :**
1. Créer un événement
2. Ajouter quelqu'un comme "Co-organisateur"
3. Vérifier qu'il a accès à "Taguer" et voit tous les médias
4. Promouvoir/rétrograder via la liste des membres

🚀
