import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  location: string | null;
  visibility: 'public' | 'private';
  created_at: string;
  attendee_count?: number;
  media_count?: number;
}

export default function MyEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyEvents();
  }, []);

  async function loadMyEvents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        // Load counts for each event
        const eventsWithCounts = await Promise.all(
          data.map(async (event: any) => {
            const [attendees, media] = await Promise.all([
              supabase
                .from('event_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id),
              supabase
                .from('media')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id),
            ]);

            return {
              ...event,
              attendee_count: attendees.count || 0,
              media_count: media.count || 0,
            };
          })
        );

        setEvents(eventsWithCounts);
      }
    } catch (error) {
      console.error('Error loading my events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadMyEvents();
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/event/${item.id}`)}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventTitleContainer}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.visibilityBadge}>
            <Ionicons
              name={item.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
              size={12}
              color={item.visibility === 'public' ? '#10b981' : '#666'}
            />
            <Text
              style={[
                styles.visibilityText,
                item.visibility === 'public' && styles.visibilityTextPublic,
              ]}
            >
              {item.visibility}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/events/${item.id}/edit`)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {item.description && (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.eventMeta}>
        {item.date && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.metaText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
        )}
        {item.location && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.eventStats}>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={16} color="#8b5cf6" />
          <Text style={styles.statText}>{item.attendee_count || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="images-outline" size={16} color="#ec4899" />
          <Text style={styles.statText}>{item.media_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No events yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/events/new')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {events.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/events/new')}
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
  list: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: {
    color: '#666',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  visibilityTextPublic: {
    color: '#10b981',
  },
  eventDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventMeta: {
    marginBottom: 12,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#666',
    fontSize: 13,
    flex: 1,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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

