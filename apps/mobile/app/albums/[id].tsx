import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { getMediaUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

interface AlbumMedia {
  media_id: string;
  added_at: string;
  media: any;
}

export default function AlbumDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<any>(null);
  const [media, setMedia] = useState<AlbumMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  async function loadAlbum() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Load album
      const { data: albumData, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single();

      if (error) throw error;
      setAlbum(albumData);
      setIsOwner(user?.id === albumData.user_id);

      // Load album media
      const { data: albumMediaData } = await supabase
        .from('album_media')
        .select('media_id, added_at')
        .eq('album_id', albumId)
        .order('added_at', { ascending: false });

      if (albumMediaData && albumMediaData.length > 0) {
        const mediaIds = albumMediaData.map((am: any) => am.media_id);
        
        const { data: mediaWithCounts } = await supabase
          .from('media_with_counts')
          .select('*')
          .in('id', mediaIds);

        const mediaMap = new Map(mediaWithCounts?.map((m: any) => [m.id, m]) || []);

        const enriched = albumMediaData.map((am: any) => ({
          media_id: am.media_id,
          added_at: am.added_at,
          media: mediaMap.get(am.media_id),
        })).filter((am) => am.media);

        setMedia(enriched);
      }
    } catch (error) {
      console.error('Error loading album:', error);
      Alert.alert('Error', 'Failed to load album');
    } finally {
      setLoading(false);
    }
  }

  const renderMediaItem = ({ item }: { item: AlbumMedia }) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const mediaUrl = getMediaUrl(item.media.storage_path, supabaseUrl);

    return (
      <TouchableOpacity
        style={styles.mediaItem}
        onPress={() => router.push(`/viewer/${item.media_id}`)}
      >
        <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
        {item.media.type === 'video' && (
          <View style={styles.playIcon}>
            <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!album) {
    return (
      <View style={styles.loading}>
        <Text style={styles.text}>Album not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {album.name}
        </Text>
        {isOwner && (
          <TouchableOpacity 
            onPress={() => router.push(`/albums/${albumId}/edit`)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        )}
      </View>

      {album.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{album.description}</Text>
        </View>
      )}

      <View style={styles.metaBar}>
        <View style={styles.metaItem}>
          <Ionicons name="images-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{media.length} photos</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons
            name={album.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
            size={16}
            color={album.visibility === 'public' ? '#10b981' : '#666'}
          />
          <Text style={styles.metaText}>{album.visibility}</Text>
        </View>
      </View>

      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.media_id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No photos in this album yet</Text>
          </View>
        }
      />
    </View>
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
  text: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  descriptionContainer: {
    padding: 16,
    paddingTop: 8,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  metaBar: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#666',
    fontSize: 14,
  },
  grid: {
    padding: 2,
  },
  mediaItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
});

