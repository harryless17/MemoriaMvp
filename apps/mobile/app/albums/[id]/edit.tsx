import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { getMediaUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

export default function EditAlbumScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
  });
  const [albumMedia, setAlbumMedia] = useState<any[]>([]);
  const [availableMedia, setAvailableMedia] = useState<any[]>([]);
  const [showAddMedia, setShowAddMedia] = useState(false);

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  async function loadAlbum() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load album
      const { data: albumData, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single();

      if (error) throw error;

      setFormData({
        name: albumData.name || '',
        description: albumData.description || '',
        visibility: albumData.visibility || 'public',
      });

      // Load album media
      const { data: albumMediaData } = await supabase
        .from('album_media')
        .select('media_id, added_at')
        .eq('album_id', albumId);

      if (albumMediaData) {
        const mediaIds = albumMediaData.map((am: any) => am.media_id);
        
        if (mediaIds.length > 0) {
          const { data: mediaData } = await supabase
            .from('media_with_counts')
            .select('*')
            .in('id', mediaIds);

          const mediaMap = new Map(mediaData?.map((m: any) => [m.id, m]) || []);
          const enriched = albumMediaData
            .map((am: any) => mediaMap.get(am.media_id))
            .filter(Boolean);
          
          setAlbumMedia(enriched);
        }
      }

      // Load user's available media
      const { data: userMedia } = await supabase
        .from('media_with_counts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAvailableMedia(userMedia || []);
    } catch (error) {
      console.error('Error loading album:', error);
      Alert.alert('Error', 'Failed to load album');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter an album name');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('albums')
        .update({
          name: formData.name,
          description: formData.description || null,
          visibility: formData.visibility,
        })
        .eq('id', albumId);

      if (error) throw error;

      Alert.alert('Success', 'Album updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating album:', error);
      Alert.alert('Error', 'Failed to update album');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedia = async (mediaId: string) => {
    try {
      await supabase
        .from('album_media')
        .insert({
          album_id: albumId,
          media_id: mediaId,
        });

      loadAlbum();
      setShowAddMedia(false);
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    try {
      await supabase
        .from('album_media')
        .delete()
        .eq('album_id', albumId)
        .eq('media_id', mediaId);

      setAlbumMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch (error) {
      console.error('Error removing media:', error);
      Alert.alert('Error', 'Failed to remove media');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Album',
      'Are you sure you want to delete this album? This will not delete the photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);

      Alert.alert('Success', 'Album deleted', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/albums'),
        },
      ]);
    } catch (error) {
      console.error('Error deleting album:', error);
      Alert.alert('Error', 'Failed to delete album');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const mediaToShow = showAddMedia
    ? availableMedia.filter(m => !albumMedia.find(am => am.id === m.id))
    : albumMedia;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Album</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Album Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="My Summer Photos"
            placeholderTextColor="#666"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Album description..."
            placeholderTextColor="#666"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.visibilityContainer}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                formData.visibility === 'public' && styles.visibilityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, visibility: 'public' })}
            >
              <Ionicons
                name="globe-outline"
                size={20}
                color={formData.visibility === 'public' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.visibilityText,
                  formData.visibility === 'public' && styles.visibilityTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.visibilityButton,
                formData.visibility === 'private' && styles.visibilityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, visibility: 'private' })}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={formData.visibility === 'private' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.visibilityText,
                  formData.visibility === 'private' && styles.visibilityTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.submitButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Media section */}
      <View style={styles.mediaSection}>
        <View style={styles.mediaSectionHeader}>
          <Text style={styles.mediaSectionTitle}>
            {showAddMedia ? 'Select Media to Add' : 'Album Photos'}
          </Text>
          <TouchableOpacity onPress={() => setShowAddMedia(!showAddMedia)}>
            <Text style={styles.toggleText}>
              {showAddMedia ? 'Done' : 'Add Photos'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={mediaToShow}
          renderItem={({ item }) => {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
            const mediaUrl = getMediaUrl(item.storage_path, supabaseUrl);

            return (
              <TouchableOpacity
                style={styles.mediaItem}
                onPress={() =>
                  showAddMedia ? handleAddMedia(item.id) : handleRemoveMedia(item.id)
                }
              >
                <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
                <View style={styles.mediaOverlay}>
                  <Ionicons
                    name={showAddMedia ? 'add-circle' : 'close-circle'}
                    size={32}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.mediaGrid}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  visibilityButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  visibilityText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaSection: {
    padding: 16,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaGrid: {
    gap: 4,
  },
  mediaItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

