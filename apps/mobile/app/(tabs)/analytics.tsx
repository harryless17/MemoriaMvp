import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface Stats {
  totalEvents: number;
  totalMedia: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalMembers: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    totalMedia: 0,
    totalLikes: 0,
    totalComments: 0,
    totalViews: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/(auth)/login');
        return;
      }

      // Load all stats in parallel
      const [
        eventsResult,
        mediaResult,
        userMediaResult,
      ] = await Promise.all([
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id),
        supabase
          .from('media')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('media')
          .select('id')
          .eq('user_id', user.id),
      ]);

      let totalLikes = 0;
      let totalComments = 0;
      let totalViews = 0;
      let totalMembers = 0;

      if (userMediaResult.data && userMediaResult.data.length > 0) {
        const mediaIds = (userMediaResult.data as any).map((m: any) => m.id);

        const [likesResult, commentsResult, viewsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('media_id', mediaIds),
          supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('media_id', mediaIds),
          supabase
            .from('media_views')
            .select('*', { count: 'exact', head: true })
            .in('media_id', mediaIds),
        ]);

        totalLikes = likesResult.count || 0;
        totalComments = commentsResult.count || 0;
        totalViews = viewsResult.count || 0;
      }

      // Load total members
      if (eventsResult.data && eventsResult.data.length > 0) {
        const eventIds = (eventsResult.data as any).map((e: any) => e.id);
        const { count: membersCount } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds);
        totalMembers = membersCount || 0;
      }

      setStats({
        totalEvents: eventsResult.count || 0,
        totalMedia: mediaResult.count || 0,
        totalLikes,
        totalComments,
        totalViews,
        totalMembers,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={32} color="#8b5cf6" />
        <Text style={styles.title}>Analytics</Text>
      </View>

      <View style={styles.grid}>
        <StatCard
          icon="calendar-outline"
          label="Events"
          value={stats.totalEvents}
          color="#8b5cf6"
        />
        <StatCard
          icon="images-outline"
          label="Media"
          value={stats.totalMedia}
          color="#ec4899"
        />
        <StatCard
          icon="heart-outline"
          label="Likes"
          value={stats.totalLikes}
          color="#ef4444"
        />
        <StatCard
          icon="chatbubble-outline"
          label="Comments"
          value={stats.totalComments}
          color="#3b82f6"
        />
        <StatCard
          icon="eye-outline"
          label="Views"
          value={stats.totalViews}
          color="#10b981"
        />
        <StatCard
          icon="people-outline"
          label="Members"
          value={stats.totalMembers}
          color="#f59e0b"
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color="#8b5cf6" />
        <Text style={styles.infoText}>
          These statistics show your overall activity on Memoria. Keep creating events and sharing moments!
        </Text>
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
    gap: 12,
    padding: 24,
    paddingTop: 48,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});

