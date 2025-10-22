# Activer Supabase Realtime pour event_attendees

Pour que les mises à jour se fassent en temps réel, il faut activer Realtime sur la table `event_attendees`.

## Étapes dans Supabase Dashboard :

1. **Va dans Database** → **Replication**
2. Cherche la table **`event_attendees`**
3. **Active** la réplication pour cette table (toggle ON)
4. Assure-toi que les événements suivants sont activés :
   - ✅ INSERT
   - ✅ UPDATE
   - ✅ DELETE

## OU exécute ce SQL :

```sql
-- Activer la réplication pour event_attendees
ALTER TABLE public.event_attendees REPLICA IDENTITY FULL;

-- Publier les changements
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
```

## Vérifier les autres tables :

Assure-toi que Realtime est aussi activé pour :
- ✅ `event_attendees` (pour les membres)
- ✅ `likes` (pour les likes en temps réel)
- ✅ `comments` (pour les commentaires en temps réel)

Après avoir fait ça, **recharge la page** et teste l'ajout de membres - ça devrait se mettre à jour instantanément ! 🚀

