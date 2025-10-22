import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import type { Media } from '@memoria/ui';
import { getMediaUrl, getThumbUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';
import { StoriesRing } from '../../src/components/StoriesRing';

export default function FeedScreen() {
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      // Load IDs of media used in stories (to exclude them)
      const { data: storiesData } = await supabase
        .from('stories')
        .select('media_id');
      
      const storyMediaIds = new Set(storiesData?.map((s: any) => s.media_id) || []);

      // Load recent public media with counts (excluding stories)
      const { data: allMediaData } = await supabase
        .from('media_with_counts')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allMediaData) {
        // Filter out stories
        const filteredMedia = allMediaData.filter((m: any) => !storyMediaIds.has(m.id));

        // Load users
        const userIds = [...new Set(filteredMedia.map((m: any) => m.user_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

        // Load events
        const eventIds = [...new Set(filteredMedia.map((m: any) => m.event_id).filter(Boolean))];
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        const eventsMap = new Map(eventsData?.map((e: any) => [e.id, e]) || []);

        // Enrich media with user and event data
        const enrichedMedia = filteredMedia
          .filter((m: any) => {
            const event = eventsMap.get(m.event_id);
            return event?.visibility === 'public';
          })
          .slice(0, 50)
          .map((m: any) => ({
            ...m,
            user: profilesMap.get(m.user_id),
            event: eventsMap.get(m.event_id),
          }));
        
        setMedia(enrichedMedia);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const renderMediaItem = ({ item }: { item: Media }) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const thumbUrl = getThumbUrl(item.thumb_path, supabaseUrl) || getMediaUrl(item.storage_path, supabaseUrl);

    return (
      <TouchableOpacity
        style={styles.mediaItem}
        onPress={() => router.push(`/viewer/${item.id}`)}
      >
        <Image source={{ uri: thumbUrl }} style={styles.mediaImage} />
        {item.type === 'video' && (
          <View style={styles.playIcon}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
          </View>
        )}
        
        {/* User Avatar */}
        <View style={styles.avatarContainer}>
          {item.user?.avatar_url ? (
            <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.user?.display_name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </View>

        {/* Media Info */}
        <View style={styles.mediaInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.event?.title}
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {item.user?.display_name || 'Anonymous'}
          </Text>
          
          {/* Counts */}
          <View style={styles.counts}>
            <View style={styles.countItem}>
              <Ionicons name="heart" size={12} color="#ef4444" />
              <Text style={styles.countText}>{item.like_count || 0}</Text>
            </View>
            <View style={styles.countItem}>
              <Ionicons name="chatbubble" size={12} color="#3b82f6" />
              <Text style={styles.countText}>{item.comment_count || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<StoriesRing />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.text}>No media yet</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  grid: {
    padding: 4,
  },
  mediaItem: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  avatarContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
  },
  counts: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
