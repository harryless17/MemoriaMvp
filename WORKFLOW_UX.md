# 🎨 Workflow UX - Face Clustering

## 📋 Workflow Utilisateur

### **1. Upload des photos**
```
Utilisateur → Upload photos → Rien ne se passe (juste upload)
```
- ✅ Photos stockées dans Supabase Storage
- ✅ Entrées créées dans la table `media`
- ❌ **Pas de détection automatique** (pour économiser les ressources)

### **2. Page /analyse**
```
Utilisateur → Navigue vers /events/:id/analyse
```
- ✅ Affiche les **personas existants** (s'il y en a)
- ✅ Affiche le statut du clustering
- ✅ Bouton **"Analyser les photos"** visible

### **3. Analyse des photos**
```
Utilisateur → Clique sur "Analyser les photos"
```

**Ce qui se passe :**

1. **Vérification des photos non taggées**
   - Frontend vérifie combien de photos n'ont **pas de tags** (pas dans `media_tags`)
   - Affiche : `"🏷️ Found X untagged photos"`

2. **Création du job de clustering**
   - Edge Function crée un job `cluster` dans `ml_jobs`
   - Job status: `pending`

3. **Traitement automatique (Job Poller)**
   - Le poller détecte le job pending
   - Appelle le ML Worker : `/cluster`

4. **ML Worker - Clustering Intelligent**
   ```
   a) Récupère les clusters existants
   b) Identifie ceux à préserver (status='linked' ou 'pending')
   c) Détecte les faces sur TOUTES les photos
   d) Assigne les faces aux clusters existants (similarité > 60%)
   e) Crée de nouveaux clusters pour les faces non-matchées
   f) JAMAIS supprimer les clusters existants
   ```

5. **Résultat affiché**
   - Personas existants **préservés**
   - Nouveaux personas **ajoutés**
   - Photos assignées aux personas

### **4. Actions manuelles**

**Pour chaque persona :**

#### **A. Assign (Assigner)**
```
Utilisateur → Clique "Assign" → Sélectionne un membre
```
- ✅ Persona passe en status `linked`
- ✅ Crée des `media_tags` pour toutes les photos du cluster
- ✅ Persona **protégé** contre la suppression

#### **B. Merge (Fusionner)**
```
Utilisateur → Clique "Merge" → Sélectionne un autre persona
```
- ✅ Fusionne deux personas en un seul
- ✅ Toutes les faces du persona source → persona cible
- ✅ Persona source supprimé

#### **C. Ignore (Ignorer)**
```
Utilisateur → Clique "Ignore"
```
- ✅ Persona passe en status `ignored`
- ✅ Sera **supprimé** au prochain clustering
- ✅ Faces marquées comme "noise"

## 🔄 Re-analyse

### **Quand re-analyser ?**

1. **Nouvelles photos uploadées**
   - Photos sans tags → Détection nécessaire

2. **Amélioration des clusters**
   - Fusion manuelle de personas
   - Correction d'erreurs

3. **Ajout de membres**
   - Nouveau membre → Re-analyse pour l'identifier

### **Que fait la re-analyse ?**

```
✅ Garde tous les personas 'linked' (assignés)
✅ Garde tous les personas 'pending' (non assignés)
✅ Détecte faces sur nouvelles photos
✅ Réassigne faces aux clusters existants
✅ Crée nouveaux clusters si nécessaire
❌ Supprime SEULEMENT les personas 'ignored'
```

## 🎯 Principes UX

### **1. Non-destructif**
- ✅ **Jamais supprimer** les personas assignés
- ✅ **Toujours préserver** les tags existants
- ✅ **Permettre la fusion** manuelle

### **2. Progressif**
- ✅ Analyse **à la demande** (pas automatique)
- ✅ Affichage **immédiat** des résultats existants
- ✅ Amélioration **incrémentale** des clusters

### **3. Transparent**
- ✅ Affiche le **nombre de photos non taggées**
- ✅ Montre le **statut du clustering**
- ✅ Logs **clairs** dans la console

### **4. Flexible**
- ✅ Permet **l'assignation** manuelle
- ✅ Permet la **fusion** de personas
- ✅ Permet **l'ignorage** de faux positifs

## 📊 États des Personas

| Status | Description | Actions possibles | Préservé au re-clustering |
|--------|-------------|-------------------|---------------------------|
| `pending` | Non assigné | Assign, Merge, Ignore | ✅ Oui |
| `linked` | Assigné à un membre | Merge, Unlink | ✅ Oui |
| `ignored` | Marqué comme faux positif | Restore | ❌ Non (supprimé) |

## 🔍 Détection des photos non taggées

### **Logique actuelle**

```typescript
// Récupérer tous les médias
const allMedia = await supabase
  .from('media')
  .select('id')
  .eq('event_id', eventId)

// Récupérer les médias taggés
const taggedMedia = await supabase
  .from('media_tags')
  .select('media_id')
  .in('media_id', allMedia.map(m => m.id))

// Photos non taggées = toutes - taggées
const untaggedMedia = allMedia.filter(m => !taggedMediaIds.has(m.id))
```

### **Pourquoi cette approche ?**

- ✅ **Plus précis** : Vérifie vraiment si la photo est identifiée
- ✅ **Plus utile** : Une photo peut être détectée mais pas taggée
- ✅ **Meilleure UX** : L'utilisateur voit combien de photos restent à identifier

## 💡 Améliorations futures

### **Court terme**
- [ ] Afficher le nombre de photos par persona
- [ ] Permettre de voir toutes les photos d'un persona
- [ ] Ajouter un bouton "Tout analyser" sur la page event

### **Moyen terme**
- [ ] Suggestions de fusion automatique (similarité > 80%)
- [ ] Historique des modifications
- [ ] Undo/Redo pour les actions

### **Long terme**
- [ ] Machine learning pour améliorer les suggestions
- [ ] Reconnaissance faciale en temps réel
- [ ] Export des tags pour d'autres applications
