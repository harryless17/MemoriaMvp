# 📖 Guide d'utilisation - Face Recognition

Guide rapide pour utiliser le système de reconnaissance faciale de Memoria.

---

## 🎯 Vue d'ensemble

Le système détecte automatiquement les visages, les regroupe par personne (clusters), et te permet de :
- ✅ Identifier qui est qui
- ✅ Fusionner les doublons
- ✅ Ignorer les erreurs
- ✅ Gérer les photos individuelles
- ✅ Filtrer pour gagner du temps

---

## 📋 Workflow complet

### 1️⃣ Analyser les photos

**Où :** Page `/events/[id]/analyse`

**Action :** Clique sur **"Analyser les photos"**

**Ce qui se passe :**
- Détection automatique des visages
- Création de clusters (groupes de personnes similaires)
- Catégorisation en "Fiables" et "À vérifier"

---

### 2️⃣ Utiliser les filtres (optionnel)

**Section filtres en haut de page**

#### Min. photos
Affiche seulement les clusters avec X photos minimum :
- `1+` : Tous les clusters
- `2+` : Au moins 2 photos (écarte les passages uniques)
- `3+` : Personnes récurrentes (recommandé)
- `5+` : Personnes très présentes
- `10+` : Personnes principales de l'événement

**💡 Conseil :** Commence par `3+` pour identifier les personnes importantes.

#### Min. qualité
Affiche seulement les clusters avec une qualité minimum :
- `Toutes` : Tous les niveaux
- `50%+` : Écarte les photos très floues
- `70%+` : Bonne qualité (recommandé)
- `80%+` : Très bonne qualité
- `90%+` : Excellence (peut-être trop strict)

**💡 Conseil :** Commence par `70%+` pour voir les meilleures détections.

#### Réinitialiser
Bouton visible quand des filtres sont actifs. Remet tout à `1+` et `Toutes`.

**Compteur :** "X / Y clusters affichés" te montre combien passent les filtres.

---

### 3️⃣ Identifier les personnes

#### Section "🎯 Fiables"
Clusters avec plusieurs photos de bonne qualité.

**Actions disponibles :**

##### 👁️ Voir toutes les photos
- Ouvre un modal avec TOUTES les photos du cluster
- Photos triées par qualité (meilleures en premier)
- Hover sur une photo → Bouton "Retirer" apparaît
- Utile pour vérifier avant d'assigner

##### 👤 Assigner
- Associe ce cluster à un participant existant
- Tags automatiques créés pour toutes les photos
- Le participant verra ces photos dans sa galerie

##### ✉️ Inviter
- Envoie une invitation par email
- Marque le cluster comme "invité"
- La personne pourra rejoindre l'événement

##### 🔀 Fusionner
- Fusionne ce cluster avec un autre
- Utile pour les doublons (même personne détectée 2 fois)
- Si le cluster principal est identifié, les tags sont créés automatiquement

##### 👁️‍🗨️ Ignorer
- Cache ce cluster de la liste
- Utile pour les faux positifs, passants, statues, etc.
- Toujours accessible via "Afficher les ignorés"

---

#### Section "⚠️ À vérifier"
Clusters avec 1-2 photos seulement ou qualité basse.

**💡 Conseils :**
- Ouvre "Voir toutes les photos" pour vérifier
- Si c'est une vraie personne → Assigner ou Fusionner
- Si c'est une erreur → Ignorer
- Si tu n'es pas sûr → Laisse en pending pour plus tard

---

### 4️⃣ Gérer les doublons

**Scénario :** Tu as 2 clusters pour la même personne.

**Solution : Fusionner**

1. Choisis le cluster **principal** (celui à garder)
   - Idéalement celui qui a le plus de photos
   - Ou celui déjà identifié/assigné

2. Clique **"Fusionner"** sur ce cluster

3. Sélectionne le cluster **secondaire** (celui à absorber)

4. Confirme

**Résultat :**
- Toutes les photos du cluster secondaire rejoignent le principal
- Le cluster secondaire disparaît
- Si le principal était assigné → Tags créés automatiquement

---

### 5️⃣ Corriger les erreurs

#### Photo mal détectée dans un cluster

**Solution : Retirer la photo**

1. Clique "👁️ Voir toutes les photos" sur le cluster
2. Trouve la photo incorrecte
3. Hover dessus → Bouton "Retirer" apparaît
4. Clique "Retirer"
5. Confirme

**Note :** Tu ne peux pas retirer la dernière photo d'un cluster.

#### Cluster complètement faux

**Solution : Ignorer**

1. Clique "👁️‍🗨️" sur le cluster
2. Confirme "Êtes-vous sûr..."
3. Le cluster disparaît

**Pour le retrouver plus tard :**
- Clique "Afficher les ignorés"
- Tu peux toujours le fusionner avec un autre si besoin

---

### 6️⃣ Vérifier les résultats

#### Section "✅ Identifiées"
Personas déjà associées à des participants.

**Ce que tu peux faire :**
- Voir toutes les photos
- Fusionner avec un doublon

**Ce que tu ne peux PAS faire :**
- Assigner (déjà fait)
- Ignorer (déjà utilisé)

---

## 🎓 Cas d'usage typiques

### Cas 1 : Mariage avec 100 photos

1. **Filtre :** `3+ photos` + `70%+ qualité`
   → Tu vois les 10-15 personnes principales

2. **Action :**
   - Assigne les mariés (facile à identifier)
   - Assigne les témoins
   - Assigne la famille proche

3. **Affine :** Remets filtre à `2+ photos`
   → Traite les invités moins photographiés

4. **Nettoie :** Remets filtre à `1+ photo`
   → Ignore les passants et erreurs

### Cas 2 : Soirée entre amis avec doublons

1. **Constat :** Tu vois "Alice" en 2 clusters différents
   - Cluster A : 8 photos (de face)
   - Cluster B : 3 photos (de profil)

2. **Solution :**
   - Ouvre les 2 clusters pour vérifier
   - Sur Cluster A : Clique "Fusionner"
   - Sélectionne Cluster B
   - Confirme → Cluster A a maintenant 11 photos

3. **Identification :**
   - Sur Cluster A fusionné : Clique "Assigner"
   - Sélectionne Alice dans la liste
   - 11 tags créés automatiquement ✨

### Cas 3 : Événement public avec faux positifs

1. **Constat :** Beaucoup de clusters avec 1 photo (passants, foule)

2. **Filtre :** `3+ photos` + `80%+ qualité`
   → Tu te concentres sur les vraies personnes

3. **Traite les clusters affichés :**
   - Assigne les organisateurs
   - Assigne les intervenants
   - Fusionne les doublons

4. **Ignore le reste :**
   - Remets filtre à `1+ photo`
   - Sélectionne tous les clusters de passants
   - Clique "Ignorer" sur chacun

---

## 💡 Astuces pro

### Ordre recommandé
1. **Filtre haut** (3+, 80%) → Identifie les VIPs
2. **Filtre moyen** (2+, 70%) → Traite les réguliers
3. **Filtre bas** (1+, toutes) → Nettoie les erreurs

### Vérifie toujours
Avant d'assigner un cluster :
- Clique "Voir toutes les photos"
- Vérifie que c'est bien la même personne
- Retire les photos incorrectes si besoin

### Fusionne intelligemment
Le cluster principal devrait être :
- ✅ Celui avec le plus de photos
- ✅ Celui avec la meilleure qualité moyenne
- ✅ Celui déjà assigné (si applicable)

### Ignore sans hésiter
Ces clusters méritent souvent un "Ignore" :
- 🚫 1 photo floue
- 🚫 Visages partiels (coupés)
- 🚫 Statues, affiches, écrans
- 🚫 Passants en arrière-plan

### Utilise les ignorés comme référence
Si tu ignores un cluster par erreur :
- "Afficher les ignorés"
- Tu peux toujours le fusionner avec un autre

---

## 🔍 Statistiques en direct

### Header de la page
```
27 personas détectées • 10 identifiées • 8 fiables • 9 à vérifier • 3 ignorés
```

**Signification :**
- **personas détectées** : Total de clusters créés
- **identifiées** : Clusters déjà assignés à un participant
- **fiables** : Clusters pending avec 3+ photos ou haute qualité
- **à vérifier** : Clusters pending avec peu de photos ou qualité basse
- **ignorés** : Clusters marqués comme ignorés (affiché si > 0)

### Filtres
```
5 / 12 clusters affichés
```
5 clusters passent les filtres actuels sur 12 pending au total.

---

## ⌨️ Raccourcis visuels

| Icône | Action | Description |
|-------|--------|-------------|
| 👁️ | Voir toutes les photos | Ouvre modal détails |
| 👤 | Assigner | Lie à un participant |
| ✉️ | Inviter | Envoie invitation email |
| 🔀 | Fusionner | Combine 2 clusters |
| 👁️‍🗨️ | Ignorer | Cache de la liste |

---

## ❓ FAQ

### Q : Pourquoi certains clusters ont 1 seule photo ?
**R :** La détection a trouvé ce visage une seule fois. C'est normal pour les passants ou les personnes peu photographiées. Utilise les filtres pour les masquer.

### Q : Je ne peux pas retirer la dernière photo d'un cluster ?
**R :** C'est normal. Un cluster doit avoir au moins 1 photo. Si la photo est mauvaise, utilise "Ignorer" sur le cluster entier.

### Q : J'ai ignoré un cluster par erreur, comment le récupérer ?
**R :** Clique "Afficher les ignorés", trouve le cluster, et fusionne-le avec un autre. Ou attends, on ajoutera un bouton "Dé-ignorer" si besoin !

### Q : Combien de clusters devrais-je fusionner ?
**R :** Ça dépend de ton événement. Pour 20-30 participants, attends-toi à fusionner 3-5 doublons (angles différents, changements de coiffure, etc.).

### Q : Les filtres affectent-ils les "Identifiées" ?
**R :** Non, les filtres ne s'appliquent qu'aux clusters "pending" (Fiables + À vérifier).

### Q : Que se passe-t-il si je fusionne 2 clusters assignés ?
**R :** Le système garde l'assignation du cluster principal. Les tags sont mis à jour automatiquement.

---

## 🎉 Bon workflow !

Tu es maintenant prêt à gérer les visages comme un pro ! 🚀

Si tu as des questions ou suggestions, n'hésite pas ! 😊

