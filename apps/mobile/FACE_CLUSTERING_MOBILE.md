# 📱 Face Clustering - Adaptation Mobile (React Native)

## 📋 Overview

Ce document guide l'adaptation de l'interface Face Clustering pour React Native (Expo).

**Status** : 🔶 À implémenter (basse priorité - web first OK pour MVP)

---

## 🎯 Composants à Créer

### 1. `/app/(tabs)/analyse.tsx` ou `/app/event/[id]/analyse.tsx`

Équivalent de `apps/web/app/events/[id]/analyse/page.tsx`

```tsx
// Copier la logique de apps/web/app/events/[id]/analyse/page.tsx
// Remplacer :
// - next/navigation → expo-router
// - HTML div → React Native View, Text, ScrollView
// - Tailwind CSS → StyleSheet ou NativeWind
```

### 2. `src/components/FacePersonGrid.tsx`

```tsx
import { View, FlatList, Image, TouchableOpacity } from 'react-native'

// Remplacer grid CSS par FlatList avec numColumns
<FlatList
  data={facePersons}
  numColumns={2}
  renderItem={({ item }) => <FacePersonCard person={item} />}
  keyExtractor={(item) => item.id}
/>
```

### 3. Modals (Bottom Sheet recommandé)

Au lieu de modals HTML, utiliser `@gorhom/bottom-sheet` :

```bash
npx expo install @gorhom/bottom-sheet
```

```tsx
import BottomSheet from '@gorhom/bottom-sheet'

<BottomSheet
  snapPoints={['50%', '90%']}
  enablePanDownToClose
>
  <AssignModalContent />
</BottomSheet>
```

---

## 🔄 Adaptations Principales

### Navigation

```tsx
// Web
import { useParams } from 'next/navigation'
const params = useParams()
const eventId = params.id

// Mobile (Expo Router)
import { useLocalSearchParams } from 'expo-router'
const { id } = useLocalSearchParams()
const eventId = id as string
```

### Fetch API

```tsx
// Identique côté Web et Mobile
const response = await fetch(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/face-persons?event_id=${eventId}`,
  {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  }
)
```

### Images

```tsx
// Web
import Image from 'next/image'
<Image src={url} width={64} height={64} />

// Mobile
import { Image } from 'expo-image'  // ou react-native
<Image 
  source={{ uri: url }} 
  style={{ width: 64, height: 64 }}
  contentFit="cover"
/>
```

### Styles

```tsx
// Option 1 : StyleSheet natif
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
})

// Option 2 : NativeWind (Tailwind pour RN)
// npm install nativewind
// Utiliser les mêmes classes que Web
<View className="bg-white rounded-lg p-3 shadow">
```

---

## 📦 Dépendances Supplémentaires

```bash
# Bottom sheets pour modals
npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler

# Image optimisée
npx expo install expo-image

# Icons (si Lucide pas dispo)
npx expo install @expo/vector-icons

# Safe area (pour encoche iPhone)
npx expo install react-native-safe-area-context
```

---

## 🎨 Structure Proposée

```
apps/mobile/
  app/
    event/
      [id]/
        analyse.tsx          # ← Page principale
  src/
    components/
      FacePersonGrid.tsx     # Grid de clusters
      FacePersonCard.tsx     # Card individuelle
      AssignBottomSheet.tsx  # Modal assign
      InviteBottomSheet.tsx  # Modal invite
      MergeBottomSheet.tsx   # Modal merge
```

---

## ⚡ Quick Start (Pseudo-code)

### `app/event/[id]/analyse.tsx`

```tsx
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import FacePersonGrid from '@/src/components/FacePersonGrid'

export default function AnalysePage() {
  const { id } = useLocalSearchParams()
  const [facePersons, setFacePersons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/face-persons?event_id=${id}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
    const result = await response.json()
    setFacePersons(result.face_persons || [])
    setLoading(false)
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Face Analysis
        </Text>
        
        <FacePersonGrid 
          facePersons={facePersons}
          onAssign={(person) => {/* open bottom sheet */}}
          onInvite={(person) => {/* open bottom sheet */}}
          onMerge={(person) => {/* open bottom sheet */}}
        />
      </View>
    </ScrollView>
  )
}
```

### `src/components/FacePersonGrid.tsx`

```tsx
import { FlatList, View } from 'react-native'
import FacePersonCard from './FacePersonCard'

export default function FacePersonGrid({ 
  facePersons, 
  onAssign, 
  onInvite, 
  onMerge 
}) {
  return (
    <FlatList
      data={facePersons}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ gap: 12 }}
      renderItem={({ item }) => (
        <FacePersonCard
          person={item}
          onAssign={() => onAssign(item)}
          onInvite={() => onInvite(item)}
          onMerge={() => onMerge(item)}
        />
      )}
      keyExtractor={(item) => item.id}
    />
  )
}
```

### `src/components/AssignBottomSheet.tsx`

```tsx
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '@/src/lib/supabaseClient'

export default function AssignBottomSheet({ 
  facePerson, 
  eventId,
  onClose, 
  onSuccess 
}) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const { data } = await supabase
      .from('event_members')
      .select('user_id, profile:profiles(*)')
      .eq('event_id', eventId)
    setMembers(data || [])
  }

  async function handleAssign(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/face-person-actions/link-user`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          face_person_id: facePerson.id,
          linked_user_id: userId,
        }),
      }
    )
    if (response.ok) {
      onSuccess()
    }
  }

  return (
    <BottomSheet snapPoints={['50%', '90%']} enablePanDownToClose>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Assign to Member
        </Text>
        
        <BottomSheetFlatList
          data={members}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleAssign(item.user_id)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {item.profile.full_name}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                {item.profile.email}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.user_id}
        />
      </View>
    </BottomSheet>
  )
}
```

---

## 🎯 Priorités d'Implémentation

### Phase 1 (Essentiel)
1. Page analyse avec liste des clusters
2. Bottom sheet Assign
3. Bottom sheet Invite

### Phase 2 (Nice to have)
4. Bottom sheet Merge
5. Actions Ignore
6. Statistiques & progress bar

### Phase 3 (Futur)
7. Offline support
8. Push notifications quand clustering terminé
9. Preview photos du cluster (carousel)

---

## 📱 UX Mobile-Specific

### Différences vs Web

| Feature | Web | Mobile |
|---------|-----|--------|
| Grille | 5 colonnes desktop | 2 colonnes portrait, 3 landscape |
| Modals | Centered overlay | Bottom sheet |
| Actions | Hover buttons | Long press menu |
| Photos preview | Lightbox | Full screen modal |

### Gestes

- **Tap** sur card → ouvre actions bottom sheet
- **Long press** → quick actions menu
- **Swipe left** sur card → quick ignore
- **Pull to refresh** → reload clusters

---

## 🧪 Testing Mobile

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical device
npx expo start --tunnel
# Scanner le QR code avec Expo Go
```

---

## 🚀 Déploiement

```bash
# Build production
eas build --platform all

# Submit stores
eas submit --platform ios
eas submit --platform android
```

---

## ✅ Checklist Mobile

- [ ] Page analyse créée
- [ ] FacePersonGrid adapté
- [ ] Bottom sheets Assign/Invite/Merge
- [ ] Images optimisées (expo-image)
- [ ] Safe areas gérées (notch)
- [ ] Loading states
- [ ] Error handling
- [ ] Pull to refresh
- [ ] Responsive 2/3 colonnes
- [ ] Tests iOS & Android
- [ ] Performance OK (<60fps scroll)

---

**Note** : L'UI web est prioritaire. Mobile peut être livré en V2 une fois le web validé par les utilisateurs.

Pour questions : consulter la doc Expo Router et React Navigation.

