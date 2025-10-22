# 🔍 DIAGNOSTIC COMPLET DU SYSTÈME

## 📊 Informations dont j'ai besoin avant de coder

### 1️⃣ **État actuel de la base de données**

**Lance ce SQL dans Supabase pour me donner une image complète :**
```sql
-- Fichier: diagnostic_complet.sql déjà créé
-- Lance-le dans Supabase et colle-moi les résultats ici
```

### 2️⃣ **Workflow actuel identifié**

Voici ce que j'ai compris de ton système :

#### **A) Upload de médias**
1. User uploade des photos via `UploadForm.tsx`
2. Photos sont insérées dans table `media`
3. **AUCUN job ML n'est créé automatiquement** ❌ (pas de trigger DB)

#### **B) Analyse des photos (bouton "Analyser les photos")**

Quand tu cliques sur "Analyser les photos" (`apps/web/app/events/[id]/analyse/page.tsx`) :

**Ligne 91-165 : Fonction `refreshAndCheckNewPhotos()`**
- Vérifie les photos non taggées
- Vérifie les jobs pending
- Appelle `triggerCompleteClustering()` qui :
  - Type = `'smart_cluster'` (ligne 185)
  - Appelle Edge Function `ml-enqueue`

**Edge Function `ml-enqueue/index.ts` (ligne 103-217) :**
- Si type = `'smart_cluster'` :
  - ✅ Récupère TOUS les médias de l'event
  - ✅ Crée **UN SEUL** job `cluster`
  - ✅ Appelle le worker pour chaque média (endpoint `/process`)
  - ✅ Appelle le worker pour clustering (endpoint `/cluster`)

**LE PROBLÈME** 🔴 :
```typescript
// Ligne 219-291 dans ml-enqueue/index.ts
else if (request.type === 'cluster') {
  // Trouve les médias non traités
  // CRÉE DES JOBS DETECT !! ❌❌❌
  await supabaseAdmin.from('ml_jobs').insert({
    job_type: 'detect',  // <-- ICI LE PROBLÈME
    event_id: request.event_id,
    media_ids: [media.media_id],
    status: 'pending',
    priority: 'high'
  })
}
```

### 3️⃣ **Le problème identifié**

#### **Symptômes :**
1. ✅ Photos avec cluster existant → détection + ajout aux tags **FONCTIONNE**
2. ❌ Nouvelles photos → devraient créer nouveaux clusters → **NE FONCTIONNE PAS**
3. ❌ Frontend bloqué en "loading" → Worker traite des centaines de vieux jobs `detect`

#### **Cause racine :**
1. **Edge Function** crée des jobs `detect` obsolètes (lignes 254-265)
2. **Worker** skip les jobs `detect` (ils sont obsolètes car le worker fait detect+cluster ensemble)
3. **Poller** du worker reste bloqué sur ces jobs au lieu de traiter les nouveaux `cluster` jobs
4. **Nouveaux clusters** ne sont pas créés car le worker ne traite jamais le job `cluster`

### 4️⃣ **Le workflow SOUHAITÉ**

```mermaid
1. User uploade 5 nouvelles photos
   ↓
2. User clique "Analyser les photos"
   ↓
3. Edge Function crée UN job 'cluster' (pas de detect)
   ↓
4. Worker traite le job:
   - Détecte les faces dans toutes les photos
   - Sauvegarde les faces dans la DB
   - Lance le clustering (DBSCAN)
   - Crée nouveaux face_persons si nécessaire
   - Assigne les faces aux clusters
   - Crée les media_tags pour les clusters "linked"
   ↓
5. Frontend affiche les nouveaux clusters
```

---

## 🎯 AVANT DE CODER : Réponds-moi

### ✅ Questions de validation :

1. **Est-ce que tu veux que l'upload de photos déclenche automatiquement la détection ?**
   - Option A : Oui, via un trigger DB sur `INSERT media`
   - Option B : Non, uniquement manuel via "Analyser les photos"

2. **Quand un utilisateur clique "Analyser les photos", tu veux :**
   - Option A : Analyser UNIQUEMENT les nouvelles photos non traitées
   - Option B : RE-analyser TOUTES les photos de l'event (re-clustering complet)

3. **Pour les clusters existants "linked", tu veux :**
   - Option A : Les préserver et ne pas les modifier
   - Option B : Les ré-assigner si le clustering trouve de meilleurs matches

### 📋 Donne-moi aussi :

1. **Résultats du SQL de diagnostic** (`diagnostic_complet.sql`)
2. **Nombre approximatif de :**
   - Jobs detect en pending : ?
   - Jobs cluster en pending : ?
   - Faces non assignées (face_person_id = NULL) : ?
   - Face_persons existants : ?

---

## 🛠️ PLAN D'ACTION (une fois que tu auras répondu)

### Phase 1 : Nettoyage (5 min)
- [ ] Supprimer TOUS les jobs `detect` de la DB
- [ ] Redémarrer le worker pour vider son cache

### Phase 2 : Correctifs Edge Function (10 min)
- [ ] Supprimer le code qui crée des jobs `detect` (lignes 219-291)
- [ ] Garder uniquement le mode `smart_cluster`
- [ ] Simplifier la logique

### Phase 3 : Tests (5 min)
- [ ] Upload 3 photos d'une nouvelle personne
- [ ] Cliquer "Analyser les photos"
- [ ] Vérifier que le nouveau cluster est créé
- [ ] Vérifier les tags

### Phase 4 : Déploiement (2 min)
- [ ] Déployer la nouvelle Edge Function
- [ ] Tester en production

---

## 📝 Notes

**Ce que je SAIS qui fonctionne :**
- ✅ Worker peut détecter les faces
- ✅ Worker peut faire le clustering (DBSCAN)
- ✅ Worker peut créer les face_persons
- ✅ Worker peut créer les media_tags
- ✅ DBSCAN trouve bien les clusters (confirmé par simulation)

**Ce qui BLOQUE :**
- ❌ Edge Function crée des jobs obsolètes
- ❌ Worker est pollué par ces vieux jobs
- ❌ Pas de mécanisme pour "skip" ou "delete" automatiquement les vieux jobs

---

**Réponds-moi avec les infos demandées et je te code la solution complète ! 🚀**

