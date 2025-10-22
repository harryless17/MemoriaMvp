import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { getMediaUrl } from '@memoria/ui';

interface Album {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private';
  created_at: string;
  cover_media_id: string | null;
  media_count?: number;
  isOwner?: boolean;
}

export default function AlbumsScreen() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load owned albums
      const { data: ownedAlbums } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load collaborated albums
      const { data: collabEntries } = await supabase
        .from('album_collaborators')
        .select('album_id')
        .eq('user_id', user.id);

      const collabAlbumIds = collabEntries?.map((c: any) => c.album_id) || [];

      let collabAlbums: any[] = [];
      if (collabAlbumIds.length > 0) {
        const { data } = await supabase
          .from('albums')
          .select('*')
          .in('id', collabAlbumIds);
        collabAlbums = data || [];
      }

      // Combine and mark ownership
      const allAlbums = [
        ...(ownedAlbums || []).map((a: any) => ({ ...a, isOwner: true })),
        ...collabAlbums.map((a: any) => ({ ...a, isOwner: false })),
      ];

      // Load media count for each album
      const albumsWithCounts = await Promise.all(
        allAlbums.map(async (album) => {
          const { count } = await supabase
            .from('album_media')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id);

          return { ...album, media_count: count || 0 };
        })
      );

      setAlbums(albumsWithCounts);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadAlbums();
  };

  const renderAlbum = ({ item }: { item: Album }) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

    return (
      <TouchableOpacity
        style={styles.albumCard}
        onPress={() => router.push(`/albums/${item.id}`)}
      >
        {/* Cover or placeholder */}
        <View style={styles.coverContainer}>
          {item.cover_media_id ? (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="images" size={40} color="#666" />
            </View>
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="images" size={40} color="#666" />
            </View>
          )}
          
          {!item.isOwner && (
            <View style={styles.collabBadge}>
              <Ionicons name="people" size={12} color="#fff" />
              <Text style={styles.collabText}>Collab</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.albumInfo}>
          <View style={styles.albumHeader}>
            <Text style={styles.albumName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.visibilityIcon}>
              <Ionicons
                name={item.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                size={16}
                color={item.visibility === 'public' ? '#10b981' : '#666'}
              />
            </View>
          </View>

          {item.description && (
            <Text style={styles.albumDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.albumMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="images-outline" size={14} color="#8b5cf6" />
              <Text style={styles.metaText}>
                {item.media_count || 0} {item.media_count === 1 ? 'photo' : 'photos'}
              </Text>
            </View>
          </View>
        </View>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={albums}
        renderItem={renderAlbum}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No albums yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/albums/new')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Album</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {albums.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/albums/new')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
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
  grid: {
    padding: 8,
  },
  albumCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  coverContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collabBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collabText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  albumInfo: {
    padding: 12,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  albumName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  visibilityIcon: {
    marginLeft: 8,
  },
  albumDescription: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  albumMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

