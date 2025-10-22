import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { getInitials, getMediaUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

export default function UserProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) setProfile(profileData);

      // Load public events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(6);

      if (eventsData) setEvents(eventsData);

      // Load public media (excluding stories)
      const { data: storiesData } = await supabase
        .from('stories')
        .select('media_id')
        .eq('user_id', userId);

      const storyMediaIds = new Set(storiesData?.map((s: any) => s.media_id) || []);

      const { data: allMediaData } = await supabase
        .from('media_with_counts')
        .select('*')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(12);

      const filteredMedia = allMediaData?.filter((m: any) => !storyMediaIds.has(m.id)) || [];
      setMedia(filteredMedia);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.text}>Profile not found</Text>
      </View>
    );
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(profile.display_name || 'User')}
            </Text>
          </View>
        )}

        <Text style={styles.displayName}>{profile.display_name || 'Anonymous'}</Text>

        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {(profile.location || profile.website) && (
          <View style={styles.metaContainer}>
            {profile.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{profile.location}</Text>
              </View>
            )}
            {profile.website && (
              <View style={styles.metaItem}>
                <Ionicons name="link-outline" size={16} color="#666" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{media.length}</Text>
            <Text style={styles.statLabel}>Media</Text>
          </View>
        </View>
      </View>

      {/* Media Grid */}
      {media.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Media</Text>
          <View style={styles.mediaGrid}>
            {media.map((item) => {
              const mediaUrl = getMediaUrl(item.storage_path, supabaseUrl);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.mediaItem}
                  onPress={() => router.push(`/viewer/${item.id}`)}
                >
                  <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
                  {item.type === 'video' && (
                    <View style={styles.playIcon}>
                      <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
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
  text: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
  },
  displayName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  bio: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  metaContainer: {
    marginTop: 12,
    gap: 8,
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    color: '#8b5cf6',
    fontSize: 24,
    fontWeight: '600',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#333',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaItem: {
    width: '32%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
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
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
});

