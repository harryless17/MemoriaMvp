# 🚀 Plan d'action pour demain

## ⚠️ PROBLÈME IDENTIFIÉ

L'Edge Function `ml-enqueue` crée encore des jobs `detect` au lieu de `cluster`.
Le clustering fonctionne mais les clusters ne sont pas créés car le worker traite des centaines de vieux jobs.

---

## 📋 ÉTAPES À SUIVRE

### 1️⃣ Nettoyer TOUS les jobs detect

**Dans Supabase → SQL Editor :**

```sql
DELETE FROM ml_jobs WHERE job_type = 'detect';
```

### 2️⃣ Vérifier que l'Edge Function crée bien des jobs cluster

**Regarde le code de l'Edge Function :**
- Fichier : `supabase/functions/ml-enqueue/index.ts`
- Ligne ~60-80 : Elle doit créer UN job `cluster` (pas des jobs `detect`)

Si elle crée encore des `detect`, corrige-la pour créer uniquement :
```typescript
{
  job_type: 'cluster',
  event_id: request.event_id,
  ...
}
```

### 3️⃣ Démarrer le système

```bash
cd /home/aghiles/Bureau/MemoriaMvp
make up-all
```

### 4️⃣ Tester

1. Va sur `/analyse`
2. Clique sur "Analyser les photos"
3. Vérifie les logs :
```bash
docker-compose logs -f ml-worker | grep -E "(Clustering|Creating.*face_persons|new_clusters)"
```

**Tu devrais voir :**
```
Clustering 17 faces...
Creating 2 face_persons...
new_clusters_created: 2
```

### 5️⃣ Vérifier les clusters créés

```bash
docker-compose exec ml-worker python3 -c "
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
response = supabase.table('face_persons').select('id, status, created_at').eq('event_id', 'fe8f08de-bd5b-4270-9d6c-df44fc9a8bef').order('created_at', desc=True).execute()

print(f'Total clusters: {len(response.data)}')
for fp in response.data:
    print(f\"  - {fp['id'][:8]} ({fp['status']}) créé le {fp['created_at'][:19]}\")
"
```

**Tu devrais voir 3 clusters** (1 ancien + 2 nouveaux) !

---

## 🎯 Résultat attendu

- **3 clusters au total** dans `face_persons`
- **2 nouveaux personas** visibles dans `/analyse`
- **Environ 6 faces** dans le nouveau cluster principal (ta nouvelle personne)

---

## 🆘 Si ça ne marche toujours pas

1. Vérifie que l'Edge Function crée bien des jobs `cluster` :
```sql
SELECT job_type, status, created_at 
FROM ml_jobs 
ORDER BY created_at DESC 
LIMIT 5;
```

2. Si elle crée encore des `detect`, CORRIGE l'Edge Function et redéploie-la

3. Vérifie les logs du worker pour voir s'il y a des erreurs lors de la création des `face_persons`

---

**Bonne nuit et à demain ! 🌙**

