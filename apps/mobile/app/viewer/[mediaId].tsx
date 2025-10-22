import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import type { Media, Comment } from '@memoria/ui';
import { getMediaUrl, formatRelativeTime } from '@memoria/ui';
import { Ionicons } from '@expo/vector-icons';

export default function MediaViewerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const mediaId = params.mediaId as string;

  const [media, setMedia] = useState<Media | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedia();
    loadComments();
    loadLikes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`media:${mediaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `media_id=eq.${mediaId}`,
        },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mediaId]);

  const loadMedia = async () => {
    try {
      // Load media with counts
      const { data: mediaData } = await supabase
        .from('media_with_counts')
        .select('*')
        .eq('id', mediaId)
        .single();

      if (mediaData) {
        // Load user profile
        let userProfile = null;
        if (mediaData.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', mediaData.user_id)
            .single();
          userProfile = profileData;
        }

        // Load event
        let eventData = null;
        if (mediaData.event_id) {
          const { data: eventResult } = await supabase
            .from('events')
            .select('*')
            .eq('id', mediaData.event_id)
            .single();
          eventData = eventResult;
        }

        setMedia({
          ...mediaData,
          user: userProfile,
          event: eventData,
        });
        setLikeCount(mediaData.like_count || 0);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      // Load user profiles
      const userIds = [...new Set(commentsData.map((c: any) => c.user_id).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      setComments(
        commentsData.map((c: any) => ({
          ...c,
          user: profilesMap.get(c.user_id),
        }))
      );
    } else {
      setComments([]);
    }
  };

  const loadLikes = async () => {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('media_id', mediaId);
    setLikeCount(count || 0);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('media_id', mediaId)
        .eq('user_id', user.id)
        .single();
      setIsLiked(!!data);
    }
  };

  const handleToggleLike = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('media_id', mediaId).eq('user_id', user.id);
        setIsLiked(false);
        setLikeCount((c) => c - 1);
      } else {
        await supabase.from('likes').insert({ media_id: mediaId, user_id: user.id });
        setIsLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.from('comments').insert({
        media_id: mediaId,
        user_id: user.id,
        text: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  if (loading || !media) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const mediaUrl = getMediaUrl(media.storage_path, supabaseUrl);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mediaContainer}>
        {media.type === 'photo' ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.text}>Video playback requires native player</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            {media.user?.avatar_url ? (
              <Image source={{ uri: media.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {media.user?.display_name?.charAt(0) || 'A'}
                </Text>
              </View>
            )}
            <View style={styles.userNames}>
              <Text style={styles.userName}>{media.user?.display_name || 'Anonymous'}</Text>
              <Text style={styles.eventName}>{media.event?.title}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#ef4444' : '#fff'}
          />
          <Text style={styles.likeCount}>{likeCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments</Text>
        <ScrollView style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <View style={styles.commentHeader}>
                {comment.user?.avatar_url ? (
                  <Image source={{ uri: comment.user.avatar_url }} style={styles.commentAvatar} />
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <Text style={styles.commentAvatarText}>
                      {comment.user?.display_name?.charAt(0) || 'A'}
                    </Text>
                  </View>
                )}
                <View style={styles.commentContent}>
                  <Text style={styles.commentUser}>{comment.user?.display_name || 'Anonymous'}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity onPress={handlePostComment} disabled={!newComment.trim()}>
            <Ionicons
              name="send"
              size={24}
              color={newComment.trim() ? '#3b82f6' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
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
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userNames: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  eventName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  commentsSection: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    padding: 16,
    paddingBottom: 8,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  comment: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  commentText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    maxHeight: 100,
  },
});

