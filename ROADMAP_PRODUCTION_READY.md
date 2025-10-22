# 🚀 ROADMAP PRODUCTION-READY - MEMORIA MVP

**Date :** Octobre 2025  
**Objectif :** Lancement en production avec effet WOW maximum  
**Stratégie :** B2B2C (Photographes → Participants)  
**Modèle :** Free / Freemium / Pro / Enterprise

---

## ✅ PHASE 0 : LANDING PAGE (TERMINÉE)

### **Livrables :**
- ✅ Landing page ultra-moderne (`/landing`)
- ✅ Routing configuré (visiteurs → `/landing`, users → `/dashboard`)
- ✅ Design system complet (glassmorphism, gradients, animations)
- ✅ Sections complètes :
  - Hero avec CTAs
  - How it works (3 étapes)
  - Use cases (tabs Photographes/Participants)
  - Stats impressionnantes
  - Témoignages
  - Pricing teaser
  - Final CTA
  - Footer complet

### **Résultat :**
**Landing page prête pour acquisition B2B !** 🎉

**Prochaine action :** Remplacer placeholders par vrai contenu (screenshots, vidéo, témoignages)

---

## 🎯 SPRINT 1 : ONBOARDING PARFAIT (1 semaine)

**Objectif :** Réduire friction, guider l'utilisateur, éviter abandon

### **1.1 Wizard Post-Création Événement** ⭐⭐⭐⭐⭐

**Problème actuel :** Utilisateur créé événement → Ne sait pas quoi faire après

**Solution :** Modale fullscreen en 4 étapes

```
┌─────────────────────────────────────────┐
│  Étape 1/4 : Inviter des participants   │
│  [InviteMembersDialog]                  │
│  [Passer] [Continuer →]                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Étape 2/4 : Uploader les photos        │
│  [UploadForm]                           │
│  [← Précédent] [Continuer →]           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Étape 3/4 : Analyser les visages       │
│  [AnalysisLauncher]                     │
│  ⏱ Temps estimé : 2-5 min               │
│  [← Précédent] [Lancer l'analyse →]    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Étape 4/4 : Identifier les personnes   │
│  [Link to /events/:id/analyse]          │
│  [← Précédent] [Terminer ✓]            │
└─────────────────────────────────────────┘
```

**Fichiers à créer :**
- `apps/web/src/components/EventWizard.tsx`
- `apps/web/src/components/AnalysisLauncher.tsx`

**Déclenchement :**
```typescript
// apps/web/app/events/new/page.tsx
router.push(`/events/${event.id}?wizard=true`);
```

**Impact :** -80% abandon, +300% complétion

**Effort :** 1 jour

---

### **1.2 Progress Tracker Visuel** ⭐⭐⭐⭐⭐

**Problème actuel :** Utilisateur ne sait pas où il en est

**Solution :** Card "santé de l'événement" en haut de page

```
┌────────────────────────────────────────┐
│ 🔄 En cours... 65%                     │
│                                         │
│ ○━━━━━━━━━━━━━━●━━━━━━━ 65%           │
│                                         │
│ ✅ 5 participants invités              │
│ ✅ 120 photos uploadées                │
│ ✅ 45 visages détectés                 │
│ ⚠️  22 personnes à identifier          │
│                                         │
│ [Identifier les personnes →]          │
└────────────────────────────────────────┘
```

**Calcul progression :**
```typescript
const progress = (
  (membersCount > 0 ? 20 : 0) +
  (mediaCount > 0 ? 20 : 0) +
  (facesDetected > 0 ? 20 : 0) +
  (taggedPercentage * 30) +
  (invitationsSent ? 10 : 0)
);
```

**Fichier à créer :**
- `apps/web/src/components/EventHealthCard.tsx`

**Placement :**
- Position sticky en haut de `/e/[id]`
- Mini version sur cards du dashboard

**Impact :** Guide permanent, -50% questions "que faire maintenant ?"

**Effort :** 1 jour

---

### **1.3 Vue "Photos Arrivent Bientôt" (Participant)** ⭐⭐⭐⭐

**Problème actuel :** Participant voit 0 photos → pense "ça marche pas" → ferme

**Solution :** Empty state engageant

```
┌──────────────────────────────────────┐
│ 🎉 Vos photos arrivent bientôt !     │
│                                       │
│ L'organisateur est en train de       │
│ préparer vos souvenirs.              │
│                                       │
│ 📸 120 photos uploadées              │
│                                       │
│ [Aperçu flouté 3×3]                  │
│                                       │
│ 🔔 Vous serez notifié !              │
│                                       │
│ 💡 En attendant :                    │
│ [Uploader mes photos]                │
│ [Inviter des amis]                   │
└──────────────────────────────────────┘
```

**Modification :**
- `apps/web/app/e/[id]/page.tsx` (section participant)

**Impact :** -70% frustration, +40% engagement

**Effort :** 0.5 jour

---

### **1.4 Notifications Push Basiques** ⭐⭐⭐⭐

**Triggers essentiels :**

1. **Nouvelles photos taggées**
   ```
   🎉 12 nouvelles photos de vous !
   → "Mariage Sophie"
   [Voir mes photos]
   ```

2. **Tagging terminé**
   ```
   ✅ Vos photos sont prêtes !
   45 photos où vous apparaissez
   [Découvrir]
   ```

**Implémentation :**

```sql
-- Trigger SQL
CREATE OR REPLACE FUNCTION notify_participant_tagged()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, event_id)
  VALUES (
    (SELECT user_id FROM event_members WHERE id = NEW.member_id),
    '🎉 Nouvelles photos !',
    format('Vous avez %s photos dans "%s"', ...),
    (SELECT event_id FROM media WHERE id = NEW.media_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_media_tag_inserted
AFTER INSERT ON media_tags
FOR EACH ROW EXECUTE FUNCTION notify_participant_tagged();
```

```typescript
// Hook React pour écouter
export function useNotificationListener() {
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        toast.success(payload.new.title, {
          description: payload.new.message,
          action: { label: 'Voir', onClick: ... }
        });
      })
      .subscribe();
  }, [user]);
}
```

**Fichiers :**
- SQL : Nouvelle migration
- `apps/web/src/hooks/useNotificationListener.ts`
- Intégrer dans `apps/web/app/layout.tsx`

**Impact :** +200% réengagement, viralité

**Effort :** 1 jour

---

### **📊 Résumé Sprint 1**

| Feature | Effort | Impact | Priorité |
|---------|--------|--------|----------|
| Wizard | 1j | ⭐⭐⭐⭐⭐ | P0 |
| Progress Tracker | 1j | ⭐⭐⭐⭐⭐ | P0 |
| Vue Participant | 0.5j | ⭐⭐⭐⭐ | P0 |
| Notifications | 1j | ⭐⭐⭐⭐ | P0 |

**Total Sprint 1 :** 3.5 jours  
**Résultat attendu :** Parcours fluide de A à Z, -80% abandon

---

## 🎨 SPRINT 2 : EFFET WOW (1 semaine)

**Objectif :** Interface qui impressionne le photographe pro

### **2.1 Unified Tagging Interface** ⭐⭐⭐⭐⭐

**Problème :** 2 pages séparées (manual tag + IA analyse) → confusion

**Solution :** 1 seule page `/events/[id]/people` avec toggle

```
┌──────────────────────────────────────────┐
│ 👥 Gestion des Personnes                │
│                                           │
│ [🤖 IA Automatique] [✋ Manuel]          │
│                                           │
│ ┌────────┐  ┌──────────────────────────┐│
│ │CLUSTERS│  │   PHOTOS                 ││
│ │        │  │   [Grid sélectionnable]  ││
│ │ Liste  │  │                          ││
│ │  de    │  │   Clic → Tag direct      ││
│ │clusters│  │   Multi-select → Masse   ││
│ └────────┘  └──────────────────────────┘│
└──────────────────────────────────────────┘
```

**Mode IA :**
- Clusters à gauche
- Photos du cluster sélectionné à droite
- Actions : Assign, Merge, Ignore

**Mode Manuel :**
- Photos sélectionnables
- Sidebar membres sticky
- Bouton "Taguer X × Y photos"

**Fichiers :**
- `apps/web/app/events/[id]/people/page.tsx` (nouveau)
- Merge code de `/tag` et `/analyse`

**Impact :** Clarté totale, -50% friction

**Effort :** 2-3 jours

---

### **2.2 AI Suggestions - Smart Matching** ⭐⭐⭐⭐⭐

**Le "wow factor" :** IA propose automatiquement l'assignation

```
┌──────────────────────────────────────┐
│ Cluster #1 (8 photos)                │
│                                       │
│ 💡 Suggestion: Marie Dupont (85%)    │
│    Raison: Nom similaire détecté     │
│                                       │
│ [✓ Accepter] [✗ Refuser] [Modifier] │
└──────────────────────────────────────┘
```

**Algorithme :**
```typescript
function suggestMember(cluster, members) {
  // 1. Similarité de nom (si OCR disponible)
  // 2. Historique (si personne vue dans autres événements)
  // 3. Fréquence (personne très photographiée = VIP)
  
  return {
    member: bestMatch,
    confidence: 85,
    reason: 'name_match' | 'historical' | 'vip_frequency'
  };
}
```

**Hook :**
- `apps/web/src/hooks/useSuggestMemberForCluster.ts`

**Impact :** -90% temps de tagging, WOW absolu

**Effort :** 2 jours

---

### **2.3 Bulk Actions & Keyboard Shortcuts** ⭐⭐⭐⭐

**Power user mode :**

```
┌────────────────────────────────────┐
│ [☑] Sélection multiple             │
│                                     │
│ [x] Cluster 1 - Sophie             │
│ [x] Cluster 3 - Thomas             │
│ [ ] Cluster 5 - Inconnu            │
│                                     │
│ 2 sélectionnés                     │
│                                     │
│ [Fusionner] [Ignorer] [Assigner]   │
└────────────────────────────────────┘
```

**Shortcuts :**
- `A` : Assign cluster
- `M` : Merge
- `I` : Ignore
- `Space` : Select
- `→/←` : Navigate
- `Esc` : Close

**Fichiers :**
- `apps/web/src/hooks/useKeyboardShortcuts.ts`
- Bouton `?` flottant pour afficher les shortcuts

**Impact :** Rapidité x10 pour pros

**Effort :** 1 jour

---

### **2.4 Undo/Redo Stack** ⭐⭐⭐

**Sécurité psychologique :**

```
┌────────────────────────────────────┐
│ Dernières actions:                 │
│                                     │
│ 🔀 Fusionné Cluster 3 → 1  [Undo] │
│ 👤 Assigné à Marie         [Undo] │
│ 🚫 Ignoré Cluster 5        [Undo] │
└────────────────────────────────────┘
```

**Implémentation :**
```typescript
const actionHistory: Action[] = [];

function undo() {
  const last = actionHistory.pop();
  await reverseAction(last);
}
```

**Impact :** Confiance utilisateur, expérimentation sans risque

**Effort :** 1.5 jour

---

### **📊 Résumé Sprint 2**

| Feature | Effort | Impact | Priorité |
|---------|--------|--------|----------|
| Unified Interface | 3j | ⭐⭐⭐⭐⭐ | P0 |
| AI Suggestions | 2j | ⭐⭐⭐⭐⭐ | P0 |
| Bulk + Shortcuts | 1j | ⭐⭐⭐⭐ | P1 |
| Undo/Redo | 1.5j | ⭐⭐⭐ | P1 |

**Total Sprint 2 :** 7.5 jours  
**Résultat attendu :** Interface pro qui bluff, gain temps x10

---

## 🎁 SPRINT 3 : POLISH & SCALE (Optionnel)

**À faire après validation marché**

### **Features :**
- Mobile face recognition simplifié (swipe)
- Analytics UX tracking
- Collaborative editing (multi-users)
- Smart albums automatiques
- Export & Print services

**Timeline :** 2-3 semaines

---

## 📈 MÉTRIQUES DE SUCCÈS

### **Acquisition (Landing Page) :**
- Visiteurs uniques / jour
- Taux de conversion Landing → Sign-up : **>5%**
- Temps passé sur landing : **>2 min**
- Scroll depth : **>70%**

### **Activation (Onboarding) :**
- % qui complètent wizard : **>80%**
- Time to first event : **<3 min**
- % événements complétés à 100% : **>60%**

### **Engagement :**
- Photos uploadées / événement : **>50**
- Participants / événement : **>10**
- % utilisant face recognition : **>70%**
- Temps moyen tagging : **<15 min**

### **Rétention :**
- D7 retention : **>40%**
- D30 retention : **>20%**
- Événements créés / mois / user : **>1.5**

### **Satisfaction :**
- NPS : **>50**
- Support tickets : **<5% users**
- 5-star reviews : **>80%**

---

## 💰 MODÈLE ÉCONOMIQUE DÉTAILLÉ

### **Free Tier** (Acquisition)
```
Prix : 0€
Limites :
- 1 événement actif
- 50 photos max
- 5 participants max
- Face recognition basique
- Branding Memoria visible
```

**Objectif :** Tester le produit, créer addiction, conversion vers Pro

---

### **Pro Tier** (Photographes/Organisateurs)
```
Prix : 29€/mois (ou 290€/an, -20%)
Tout illimité :
- Événements ∞
- Photos ∞
- Participants ∞
- Face recognition avancé + suggestions IA
- Support prioritaire
- Analytics avancés
- Export haute qualité
- Pas de branding
```

**Objectif :** Core revenue stream

**Calcul :**
- 100 users Pro × 29€ = **2,900€/mois**
- 1,000 users Pro × 29€ = **29,000€/mois**

---

### **Enterprise** (Studios Photo, Agences)
```
Prix : Custom (à partir de 500€/mois)
Tout de Pro +
- Multi-utilisateurs (équipes)
- White-label complet
- API access
- Custom domain
- SLA garanti
- Account manager dédié
- Facturation annuelle
- Support 24/7
```

**Objectif :** Gros contrats, MRR stable

---

### **Add-ons Optionnels (Future) :**
- Print services (livres photo) : +20% marge
- Storage additionnel : 5€/50GB
- Custom AI models : 50€/événement
- Pro photography tools : 10€/mois

---

## 🎯 PLAN DE LANCEMENT (4 semaines)

### **Semaine 1 : Sprint 1 (Onboarding)**
- Lundi-Mardi : Wizard + Progress Tracker
- Mercredi : Vue Participant
- Jeudi-Vendredi : Notifications Push
- Weekend : Tests + fixes

### **Semaine 2 : Sprint 2 Part 1**
- Lundi-Mercredi : Unified Tagging Interface
- Jeudi-Vendredi : AI Suggestions (base)

### **Semaine 3 : Sprint 2 Part 2**
- Lundi-Mardi : AI Suggestions (advanced)
- Mercredi : Bulk Actions + Shortcuts
- Jeudi-Vendredi : Tests intensifs

### **Semaine 4 : Polish & Launch**
- Lundi-Mardi : Undo/Redo (si temps)
- Mercredi : Contenu landing (screenshots, video)
- Jeudi : Tests final, SEO, Analytics
- Vendredi : **🚀 LANCEMENT PRODUCTION**

---

## 🚀 CHECKLIST PRÉ-LANCEMENT

### **Technique :**
- [ ] Tous les sprints complétés
- [ ] 0 bugs critiques
- [ ] Performance > 90 Lighthouse
- [ ] Mobile parfait (iOS + Android)
- [ ] Dark mode impeccable
- [ ] SEO optimisé (meta tags, sitemap)
- [ ] Analytics installé (GA4, Mixpanel)
- [ ] Error tracking (Sentry)
- [ ] Backups automatiques configurés

### **Contenu :**
- [ ] Landing page avec vrai contenu
- [ ] Screenshots/video demo
- [ ] Témoignages réels (minimum 3)
- [ ] Pages légales (CGU, Privacy, Cookies)
- [ ] FAQ complète
- [ ] Documentation utilisateur

### **Business :**
- [ ] Stripe configuré (paiements)
- [ ] Plans tarifaires activés
- [ ] Email transactionnel (SendGrid/Postmark)
- [ ] Support configuré (Intercom/Crisp)
- [ ] Monitoring (UptimeRobot)

### **Marketing :**
- [ ] Page Facebook/Instagram
- [ ] LinkedIn company page
- [ ] Twitter account
- [ ] ProductHunt draft prêt
- [ ] Email de lancement rédigé
- [ ] Press kit disponible

---

## 📣 STRATÉGIE DE LANCEMENT

### **Jour 0 (Pre-launch) :**
- Email beta testers existants
- Post sur réseaux persos
- Demander feedback beta

### **Jour 1 (Launch Day) :**
- ProductHunt launch (6h PST)
- Post LinkedIn + Twitter
- Email newsletter
- Post sur forums photographes

### **Semaine 1 :**
- Outreach photographes (cold email)
- Partenariats studios photo
- Guest posts blogs événementiels
- YouTube demo video

### **Mois 1 :**
- SEO content (blog)
- Google Ads campagne test
- Facebook Ads (retargeting)
- Affiliés (photographes)
- Case studies clients

---

## 🎉 OBJECTIFS POST-LANCEMENT

### **Mois 1 :**
- 100 sign-ups
- 20 événements créés
- 5 conversions Pro
- NPS > 50

### **Mois 3 :**
- 500 sign-ups
- 100 événements/mois
- 30 Pro users
- 10K€ MRR

### **Mois 6 :**
- 2,000 users
- 500 événements/mois
- 100 Pro users
- 30K€ MRR
- 1 Enterprise client

### **An 1 :**
- 10,000 users
- 50K€ MRR
- Profitabilité
- Levée de fonds Seed (optionnel)

---

## 💡 PROCHAINE SESSION

**On attaque Sprint 1 : Wizard Post-Création ?**

Je peux créer les composants immédiatement :
1. `EventWizard.tsx`
2. `EventHealthCard.tsx`
3. Modifier la vue participant
4. Setup notifications

**Tu es prêt ?** 🚀

