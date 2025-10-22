import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import type { Event, Media } from '@memoria/ui';
import { formatDate, getMediaUrl, getThumbUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventData) {
        // Load owner profile
        let ownerProfile = null;
        if (eventData.owner_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', eventData.owner_id)
            .single();
          ownerProfile = profileData;
        }

        setEvent({ ...eventData, owner: ownerProfile });
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: memberData } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();
        setIsMember(!!memberData);
      }

      // Load media with counts (excluding stories)
      const { data: storiesData } = await supabase
        .from('stories')
        .select('media_id')
        .eq('event_id', eventId);

      const storyMediaIds = new Set(storiesData?.map((s: any) => s.media_id) || []);

      const { data: allMediaData } = await supabase
        .from('media_with_counts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (allMediaData) {
        const filteredMedia = allMediaData.filter((m: any) => !storyMediaIds.has(m.id));

        // Load user profiles
        const userIds = [...new Set(filteredMedia.map((m: any) => m.user_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

        setMedia(
          filteredMedia.map((m: any) => ({
            ...m,
            user: profilesMap.get(m.user_id),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to join this event');
      return;
    }

    try {
      await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id,
      });
      setIsMember(true);
      Alert.alert('Success', 'You joined the event!');
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Error', 'Failed to join event');
    }
  };

  const renderMediaItem = ({ item }: { item: Media }) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const thumbUrl =
      getThumbUrl(item.thumb_path, supabaseUrl) || getMediaUrl(item.storage_path, supabaseUrl);

    return (
      <TouchableOpacity
        style={styles.mediaItem}
        onPress={() => router.push(`/viewer/${item.id}`)}
      >
        <Image source={{ uri: thumbUrl }} style={styles.mediaImage} />
        {item.type === 'video' && (
          <View style={styles.playIcon}>
            <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
          </View>
        )}
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

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{event.title}</Text>
          {!isMember && (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinEvent}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>

        {event.description && <Text style={styles.description}>{event.description}</Text>}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons
              name={event.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
              size={14}
              color="#666"
            />
            <Text style={styles.metaText}>{event.visibility}</Text>
          </View>
          {event.date && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{formatDate(event.date)}</Text>
            </View>
          )}
          {event.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.mediaSection}>
        <Text style={styles.sectionTitle}>Media ({media.length})</Text>
        <FlatList
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.mediaGrid}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.text}>No media yet</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButtonContainer: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  header: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  meta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  mediaSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    padding: 16,
    paddingBottom: 8,
  },
  mediaGrid: {
    padding: 4,
  },
  mediaItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
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
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
});

