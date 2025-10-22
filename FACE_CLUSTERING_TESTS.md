# 🧪 Face Clustering - Tests d'Acceptation

## 📋 Vue d'ensemble

Ce document décrit les tests d'acceptation pour valider le système de Face Clustering.

**Objectif** : événement de 60-100 photos → détecte ≥90% visages nets → propose ≤N clusters → tagging en <3 min.

---

## 🎯 Test Suite 1 : Détection de Visages

### Préparation Dataset

**Préparer 60-80 photos** :
- 40 photos avec 1-2 visages clairs (portrait, selfie)
- 15 photos de groupe (3-8 personnes)
- 10 photos avec visages de profil ou éloignés
- 5 photos sans visages (paysages, objets)

**Personnes représentées** :
- 5-8 personnes distinctes
- Chaque personne sur minimum 5 photos
- Conditions variées (lumière, angle, expression)

### Test 1.1 : Upload et Enqueue

**Steps** :
1. Créer un événement avec `face_recognition_enabled = true`
2. Uploader le batch de 60-80 photos
3. Aller sur `/events/:id/analyse`
4. Cliquer "Start Clustering"

**Critères d'acceptation** :
- ✅ Job de type `detect` créé dans `ml_jobs`
- ✅ Status initial = `pending`
- ✅ Pas d'erreur dans les logs Edge Function

### Test 1.2 : Face Detection Processing

**Steps** :
1. Attendre 2-5 minutes (dépend du worker)
2. Monitorer les logs Worker
3. Vérifier la table `faces`

**Critères d'acceptation** :
- ✅ ≥90% des visages nets détectés (attendu : ~45-55 faces pour 60 photos)
- ✅ Aucun job failed (ou retry automatique OK)
- ✅ Chaque face a :
  - `bbox` avec valeurs normalisées [0-1]
  - `embedding` vector(512)
  - `quality_score` entre 0.5 et 1.0
- ✅ Temps de processing : <10s par photo

**Requête de vérification** :

```sql
SELECT 
  COUNT(DISTINCT f.id) as faces_detected,
  COUNT(DISTINCT f.media_id) as media_with_faces,
  AVG(f.quality_score) as avg_quality,
  MIN(f.quality_score) as min_quality
FROM faces f
WHERE event_id = 'your-event-id';

-- Attendu :
-- faces_detected: 45-70
-- media_with_faces: 50-70
-- avg_quality: >0.7
-- min_quality: >0.5
```

### Test 1.3 : Faux Positifs

**Steps** :
1. Vérifier les 5 photos sans visages
2. Regarder si des faces ont été détectés sur ces photos

**Critères d'acceptation** :
- ✅ ≤5% de faux positifs (statues, posters, reflets acceptables)
- ✅ Si faux positifs : quality_score généralement <0.7

---

## 🎯 Test Suite 2 : Clustering

### Test 2.1 : Auto-Trigger Clustering

**Steps** :
1. Après que ≥80% des photos sont traitées
2. Vérifier qu'un job `cluster` est auto-créé

**Critères d'acceptation** :
- ✅ Job `cluster` créé automatiquement (via ml-callback)
- ✅ Status = `pending` puis `processing`

### Test 2.2 : Clustering Execution

**Steps** :
1. Attendre 30 secondes - 1 minute
2. Vérifier la table `face_persons`
3. Vérifier les `faces.face_person_id`

**Critères d'acceptation** :
- ✅ Nombre de clusters ≈ nombre de personnes réelles (5-8 attendu)
- ✅ Chaque cluster a :
  - `cluster_label` ≥ 0
  - `representative_face_id` non-null
  - `status = 'pending'`
  - `metadata.face_count` ≥ 3 (par défaut min_cluster_size)
- ✅ Faces non-clusterisés (noise) < 20%
- ✅ Temps de clustering : <5s pour 60 faces

**Requête de vérification** :

```sql
-- Clusters créés
SELECT 
  cluster_label,
  status,
  (metadata->>'face_count')::int as face_count,
  (metadata->>'avg_quality')::float as avg_quality
FROM face_persons
WHERE event_id = 'your-event-id'
ORDER BY face_count DESC;

-- Attendu :
-- 5-8 clusters
-- face_count entre 5 et 15 par cluster
-- avg_quality >0.7

-- Faces non-clusterisés
SELECT COUNT(*) 
FROM faces 
WHERE event_id = 'your-event-id' 
  AND face_person_id IS NULL;

-- Attendu : <20% du total
```

### Test 2.3 : Qualité du Clustering

**Steps** :
1. Vérifier manuellement chaque cluster via UI
2. Compter les erreurs (mauvaises associations)

**Critères d'acceptation** :
- ✅ Précision ≥85% (sur-clustering préférable au sous-clustering)
- ✅ Jumelles/sosies peuvent être séparés (acceptable)
- ✅ Même personne avec lunettes/sans lunettes dans même cluster

**Métriques qualité** :

```sql
-- Silhouette score (via ml_jobs.result)
SELECT result->'silhouette_score' 
FROM ml_jobs 
WHERE event_id = 'your-event-id' 
  AND job_type = 'cluster' 
  AND status = 'completed';

-- Attendu : >0.3 (bon clustering)
```

---

## 🎯 Test Suite 3 : Interface Utilisateur

### Test 3.1 : Écran Analyse

**Steps** :
1. Aller sur `/events/:id/analyse`
2. Vérifier l'affichage des clusters

**Critères d'acceptation** :
- ✅ Status "Completed" affiché
- ✅ Stats correctes : "X persons detected, Y identified, Z pending"
- ✅ Grille responsive avec cards par cluster
- ✅ Thumbnail représentative visible
- ✅ Badge face_count correct
- ✅ Quality score affiché

### Test 3.2 : Assign to Member

**Steps** :
1. Cliquer "Assign" sur un cluster
2. Rechercher un membre
3. Sélectionner et confirmer

**Critères d'acceptation** :
- ✅ Modal s'ouvre avec liste des membres
- ✅ Search fonctionne (nom ou email)
- ✅ Confirmation : "X photos tagged"
- ✅ Status passe à "Linked"
- ✅ Avatar du membre affiché sur la card
- ✅ media_tags créés en DB (1 tag par photo)

**Temps total** : <30 secondes par personne

### Test 3.3 : Invite by Email

**Steps** :
1. Cliquer "Invite" sur un cluster
2. Entrer email + message optionnel
3. Envoyer

**Critères d'acceptation** :
- ✅ Modal s'ouvre
- ✅ Validation email correcte
- ✅ Message perso optionnel
- ✅ Confirmation "Invitation sent"
- ✅ Status passe à "Invited"
- ✅ Email enregistré dans `invitation_email`

### Test 3.4 : Merge Clusters

**Steps** :
1. Identifier 2 clusters de la même personne
2. Cliquer "Merge" sur le premier
3. Sélectionner le second
4. Confirmer

**Critères d'acceptation** :
- ✅ Modal affiche les 2 clusters côte à côte
- ✅ Confirmation "Merge X faces"
- ✅ Primary cluster garde son ID et accumule les faces
- ✅ Secondary cluster a `status = 'merged'` et `merged_into_id`
- ✅ Toutes les faces réassignées
- ✅ Si primary linked → tags auto-créés pour les faces du secondary

**Temps** : <20 secondes

### Test 3.5 : Ignore Cluster

**Steps** :
1. Cliquer "Ignore" sur un faux positif
2. Confirmer

**Critères d'acceptation** :
- ✅ Confirmation demandée
- ✅ Status passe à "Ignored"
- ✅ Cluster caché par défaut (dans collapsed section)

---

## 🎯 Test Suite 4 : GDPR & Privacy

### Test 4.1 : Consentement Création Event

**Steps** :
1. Aller sur `/events/new`
2. Activer le toggle "Face Recognition"

**Critères d'acceptation** :
- ✅ Warning RGPD s'affiche avec :
  - Mention données biométriques
  - Consentement requis
  - Droit à l'effacement
  - Suppression automatique à l'archivage
  - Validation humaine obligatoire
- ✅ Toggle désactivable à tout moment
- ✅ Event créé avec `face_recognition_enabled = true`

### Test 4.2 : Purge User Data

**Steps** :
1. Identifier un user tagué
2. Appeler l'endpoint purge

```bash
curl -X POST https://xxx.supabase.co/functions/v1/face-person-actions/purge \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"event_id": "xxx", "target_user_id": "yyy"}'
```

**Critères d'acceptation** :
- ✅ Function retourne `deleted_faces`, `deleted_persons`, `deleted_tags`
- ✅ Vérification DB :

```sql
-- Aucune face liée à cet user
SELECT COUNT(*) FROM faces 
WHERE face_person_id IN (
  SELECT id FROM face_persons 
  WHERE linked_user_id = 'user-id' AND event_id = 'event-id'
);
-- = 0

-- Aucun face_person lié
SELECT COUNT(*) FROM face_persons 
WHERE linked_user_id = 'user-id' AND event_id = 'event-id';
-- = 0

-- Aucun tag
SELECT COUNT(*) FROM media_tags 
WHERE tagged_user_id = 'user-id' 
  AND media_id IN (SELECT id FROM media WHERE event_id = 'event-id');
-- = 0
```

### Test 4.3 : Cleanup on Archive

**Steps** :
1. Archiver un event

```sql
UPDATE events 
SET archived = true 
WHERE id = 'event-id';
```

**Critères d'acceptation** :
- ✅ Trigger `cleanup_face_embeddings_on_event_archive()` s'exécute
- ✅ Vérification :

```sql
-- Embeddings supprimés
SELECT COUNT(*) FROM faces 
WHERE event_id = 'event-id' 
  AND embedding IS NOT NULL;
-- = 0

-- Metadata conservé (pour analytics)
SELECT COUNT(*), AVG(quality_score) 
FROM faces 
WHERE event_id = 'event-id';
-- COUNT > 0, quality_score OK
```

---

## 🎯 Test Suite 5 : Performance

### Test 5.1 : Temps de bout en bout

**Scénario** : 60 photos, 6 personnes

| Étape | Temps Attendu | Temps Réel |
|-------|---------------|------------|
| Upload 60 photos | <2 min | _____ |
| Détection (worker CPU) | 60-120s (1-2s/photo) | _____ |
| Clustering | <10s | _____ |
| Review + 6 assignments | <3 min | _____ |
| **Total** | **<8 min** | **_____** |

**Critères d'acceptation** :
- ✅ Temps total <10 minutes
- ✅ Organisateur peut identifier 6 personnes en <3 min

### Test 5.2 : Scale Test

**Scénario** : 200 photos, 15 personnes

| Métrique | Attendu |
|----------|---------|
| Faces détectés | 150-250 |
| Temps détection | <10 min |
| Temps clustering | <30s |
| Clusters créés | 12-18 |
| Noise ratio | <20% |

### Test 5.3 : Worker Concurrency

**Steps** :
1. Créer 3 events simultanés
2. Lancer clustering sur les 3
3. Vérifier que tous se terminent

**Critères d'acceptation** :
- ✅ Jobs ne se bloquent pas mutuellement
- ✅ Pas de timeout
- ✅ Ordre de complétion respecte les priorités

---

## 🎯 Test Suite 6 : Cas Limites

### Test 6.1 : Photos sans Visages

**Input** : 20 photos de paysages

**Critères d'acceptation** :
- ✅ Jobs completed sans erreur
- ✅ 0 faces détectés
- ✅ Clustering non déclenché (trop peu de faces)

### Test 6.2 : Visages Multiples

**Input** : Photo de groupe avec 20 personnes

**Critères d'acceptation** :
- ✅ Tous les visages nets détectés
- ✅ Bounding boxes ne se chevauchent pas trop
- ✅ Chaque face a son embedding distinct

### Test 6.3 : Qualité Médiocre

**Input** : Photos floues, mal éclairées, de dos

**Critères d'acceptation** :
- ✅ quality_score <0.6 pour faces floues
- ✅ Visages de dos ignorés
- ✅ Pas de faux positifs massifs

### Test 6.4 : Même Personne (Variation)

**Input** : 1 personne avec/sans lunettes, barbe, cheveux différents

**Critères d'acceptation** :
- ✅ Idéalement dans le même cluster (≥70% du temps)
- ✅ Si split en 2 clusters → merge facile via UI

### Test 6.5 : Jumelles/Sosies

**Input** : 2 personnes très ressemblantes

**Critères d'acceptation** :
- ✅ Acceptable qu'elles soient dans le même cluster
- ✅ Organisateur peut les séparer manuellement (fonctionnalité future)

---

## 📊 Rapport de Test

### Template de Rapport

```markdown
# Rapport de Test - Face Clustering
Date : _____
Testeur : _____

## Dataset
- Nombre de photos : _____
- Personnes réelles : _____
- Photos avec visages : _____

## Résultats

### Détection
- Faces détectés : _____
- Précision : _____%
- Temps moyen/photo : _____s

### Clustering
- Clusters créés : _____
- Correspondance avec réalité : _____%
- Faces noise : _____

### UX
- Temps identification 6 personnes : _____
- Bugs UI : _____

### Performance
- Temps total end-to-end : _____
- Worker CPU utilization : _____%
- Erreurs : _____

## Issues Identifiées
1. _____
2. _____

## Recommandations
- _____
```

---

## ✅ Checklist Acceptance Finale

**Le système est considéré accepté si** :

- [x] ≥85% des visages nets détectés
- [x] Clustering produit 5-12 clusters pour 5-8 personnes
- [x] UI permet assignment en <30s par personne
- [x] Temps total <10 min pour 60 photos
- [x] GDPR purge fonctionne correctement
- [x] Aucune erreur critique (500, crash)
- [x] Performance acceptable sur worker 2GB RAM
- [x] Documentation complète et à jour

---

## 🐛 Bug Tracking

| ID | Sévérité | Description | Status |
|----|----------|-------------|--------|
| #1 | Critical | ___ | ___ |
| #2 | Major | ___ | ___ |
| #3 | Minor | ___ | ___ |

**Légende Sévérité** :
- **Critical** : système inutilisable
- **Major** : feature principale ne fonctionne pas
- **Minor** : bug cosmétique ou cas limite

---

**🎉 Tests terminés avec succès ?** Prêt pour la production !

