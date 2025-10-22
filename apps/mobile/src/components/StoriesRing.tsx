import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface Story {
  id: string;
  user_id: string;
  media_id: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  media: {
    storage_path: string;
    type: string;
  };
  viewed: boolean;
}

interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string | null;
  stories: Story[];
  hasViewed: boolean;
}

export function StoriesRing() {
  const router = useRouter();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
    loadStories();

    // Realtime subscription
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function loadStories() {
    try {
      // Load all active stories
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!storiesData || storiesData.length === 0) {
        setStoryGroups([]);
        setLoading(false);
        return;
      }

      // Load users
      const userIds = [...new Set((storiesData as any[]).map((s) => s.user_id))];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const usersMap = new Map((usersData as any)?.map((u: any) => [u.id, u]) || []);

      // Load media
      const mediaIds = (storiesData as any[]).map((s) => s.media_id);
      const { data: mediaData } = await supabase
        .from('media')
        .select('id, storage_path, type')
        .in('id', mediaIds);

      const mediaMap = new Map((mediaData as any)?.map((m: any) => [m.id, m]) || []);

      // Load viewed stories
      const viewedStoryIds = new Set<string>();
      if (currentUser) {
        const { data: viewsData } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_id', currentUser.id);

        (viewsData as any)?.forEach((v: any) => viewedStoryIds.add(v.story_id));
      }

      // Group stories by user
      const groups: Map<string, StoryGroup> = new Map();

      (storiesData as any[]).forEach((story) => {
        const user = usersMap.get(story.user_id) as any;
        const media = mediaMap.get(story.media_id) as any;

        if (!user || !media) return;

        const storyWithDetails = {
          ...story,
          user,
          media,
          viewed: viewedStoryIds.has(story.id),
        };

        if (groups.has(story.user_id)) {
          groups.get(story.user_id)!.stories.push(storyWithDetails);
          if (!storyWithDetails.viewed) {
            groups.get(story.user_id)!.hasViewed = false;
          }
        } else {
          groups.set(story.user_id, {
            userId: story.user_id,
            userName: user.display_name || 'Anonymous',
            userAvatar: user.avatar_url || null,
            stories: [storyWithDetails],
            hasViewed: storyWithDetails.viewed,
          });
        }
      });

      setStoryGroups(Array.from(groups.values()));
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStoryPress = (group: StoryGroup) => {
    // Navigate to story viewer with group data
    router.push({
      pathname: '/stories/viewer',
      params: {
        groupData: JSON.stringify(group),
      },
    });
  };

  const handleCreateStory = () => {
    router.push('/stories/new');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.storyItem}>
              <View style={styles.skeletonRing}>
                <View style={styles.skeletonAvatar} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (storyGroups.length === 0 && !currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add story button */}
        {currentUser && (
          <TouchableOpacity onPress={handleCreateStory} style={styles.storyItem}>
            <View style={styles.addStoryRing}>
              <View style={styles.addStoryContent}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              Your Story
            </Text>
          </TouchableOpacity>
        )}

        {/* Story groups */}
        {storyGroups.map((group) => (
          <TouchableOpacity
            key={group.userId}
            onPress={() => handleStoryPress(group)}
            style={styles.storyItem}
          >
            <View style={[
              styles.storyRing,
              group.hasViewed ? styles.viewedRing : styles.newRing,
            ]}>
              <View style={styles.storyInner}>
                {group.userAvatar ? (
                  <Image source={{ uri: group.userAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {group.userName.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              {group.userName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  scroll: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRing: {
    background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
    // For RN, we'll use a solid color
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  viewedRing: {
    borderWidth: 2,
    borderColor: '#666',
  },
  addStoryRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryContent: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  storyName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 70,
    textAlign: 'center',
  },
  skeletonRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
  },
});

