import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { getMediaUrl } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const STORY_DURATION = 5000;

export default function StoryViewerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [groupData, setGroupData] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.groupData) {
      const data = JSON.parse(params.groupData as string);
      setGroupData(data);
    }
    loadCurrentUser();
  }, [params.groupData]);

  useEffect(() => {
    if (!groupData) return;

    // Mark story as viewed
    markAsViewed(groupData.stories[currentIndex].id);

    // Start progress animation
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  }, [currentIndex, groupData]);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function markAsViewed(storyId: string) {
    if (!currentUserId) return;

    try {
      await supabase.from('story_views').upsert({
        story_id: storyId,
        viewer_id: currentUserId,
      }, {
        onConflict: 'story_id,viewer_id',
        ignoreDuplicates: true,
      });
    } catch (error) {
      console.debug('Error marking story as viewed:', error);
    }
  }

  const handleNext = () => {
    if (currentIndex < groupData.stories.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      router.back();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const handleDelete = () => {
    const currentStory = groupData.stories[currentIndex];
    
    Alert.alert(
      'Delete Story?',
      'This story will be permanently deleted. This action cannot be undone.',
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
    if (!groupData || deleting) return;

    setDeleting(true);
    const currentStory = groupData.stories[currentIndex];

    try {
      // Delete the story
      await supabase
        .from('stories')
        .delete()
        .eq('id', currentStory.id);

      // Delete the media
      await supabase
        .from('media')
        .delete()
        .eq('id', currentStory.media_id);

      // Delete from storage
      if (currentStory.media.storage_path) {
        await supabase.storage
          .from('media')
          .remove([currentStory.media.storage_path]);
      }

      // Update group data
      const updatedStories = groupData.stories.filter(
        (s: any) => s.id !== currentStory.id
      );

      if (updatedStories.length === 0) {
        router.back();
      } else {
        setGroupData({ ...groupData, stories: updatedStories });
        if (currentIndex >= updatedStories.length) {
          setCurrentIndex(updatedStories.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      Alert.alert('Error', 'Failed to delete story');
    } finally {
      setDeleting(false);
    }
  };

  if (!groupData) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentStory = groupData.stories[currentIndex];
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const mediaUrl = getMediaUrl(currentStory.media.storage_path, supabaseUrl);
  const isOwnStory = currentUserId === currentStory.user_id;

  return (
    <View style={styles.container}>
      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {groupData.stories.map((_: any, index: number) => (
          <View key={index} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', index === currentIndex ? '100%' : index < currentIndex ? '100%' : '0%'],
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {groupData.userAvatar ? (
            <Image source={{ uri: groupData.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {groupData.userName.charAt(0)}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>{groupData.userName}</Text>
            <Text style={styles.time}>
              {new Date(currentStory.created_at).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {isOwnStory && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Media */}
      <View style={styles.mediaContainer}>
        {currentStory.media.type === 'photo' ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoText}>Video playback requires native player</Text>
          </View>
        )}
      </View>

      {/* Caption */}
      {currentStory.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{currentStory.caption}</Text>
        </View>
      )}

      {/* Tap zones */}
      <View style={styles.tapZones}>
        <TouchableOpacity style={styles.leftZone} onPress={handlePrevious} />
        <TouchableOpacity style={styles.rightZone} onPress={handleNext} />
      </View>
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
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  progressContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  header: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  leftZone: {
    flex: 1,
  },
  rightZone: {
    flex: 1,
  },
});

