import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@memoria/ui';
import { uploadQueue } from '@/features/upload/queue';
import { Ionicons } from '@expo/vector-icons';

const MAX_FILES = 20;

export default function UploadScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  useEffect(() => {
    loadUserEvents();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant media library access to upload photos');
    }
  };

  const loadUserEvents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberEvents } = await supabase
        .from('event_attendees')
        .select('event_id, events(*)')
        .eq('user_id', user.id);

      const { data: ownedEvents } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id);

      const allEvents = new Map<string, Event>();
      ownedEvents?.forEach((e) => allEvents.set(e.id, e));
      memberEvents?.forEach((m: any) => {
        if (m.events) allEvents.set(m.events.id, m.events);
      });

      setEvents(
        Array.from(allEvents.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handlePickImages = async () => {
    if (selectedFiles.length >= MAX_FILES) {
      Alert.alert('Limit Reached', `You can only upload ${MAX_FILES} files at once`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      const combined = [...selectedFiles, ...newUris].slice(0, MAX_FILES);
      setSelectedFiles(combined);
    }
  };

  const handleTakePhoto = async () => {
    if (selectedFiles.length >= MAX_FILES) {
      Alert.alert('Limit Reached', `You can only upload ${MAX_FILES} files at once`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera access to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedFiles([...selectedFiles, result.assets[0].uri]);
    }
  };

  const removeFile = (uri: string) => {
    setSelectedFiles(selectedFiles.filter((f) => f !== uri));
  };

  const handleUpload = async () => {
    if (!selectedEventId || selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select an event and at least one file');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Add files to upload queue
    for (const uri of selectedFiles) {
      await uploadQueue.addToQueue({
        eventId: selectedEventId,
        uri,
        type: 'photo', // TODO: detect video
        visibility,
      });
    }

    // Process queue
    uploadQueue.processQueue();

    Alert.alert('Success', 'Files added to upload queue');
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Select Event</Text>
          <View style={styles.picker}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventOption, selectedEventId === event.id && styles.eventOptionSelected]}
                onPress={() => setSelectedEventId(event.id)}
              >
                <Text style={styles.eventOptionText}>{event.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[styles.segment, visibility === 'public' && styles.segmentActive]}
              onPress={() => setVisibility('public')}
            >
              <Text style={[styles.segmentText, visibility === 'public' && styles.segmentTextActive]}>
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, visibility === 'private' && styles.segmentActive]}
              onPress={() => setVisibility('private')}
            >
              <Text style={[styles.segmentText, visibility === 'private' && styles.segmentTextActive]}>
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePickImages}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Choose Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {selectedFiles.length > 0 && (
          <>
            <Text style={styles.label}>{selectedFiles.length} file(s) selected</Text>
            <FlatList
              data={selectedFiles}
              keyExtractor={(item) => item}
              horizontal
              renderItem={({ item }) => (
                <View style={styles.thumbnail}>
                  <Image source={{ uri: item }} style={styles.thumbnailImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFile(item)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.thumbnailList}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.uploadButton, (!selectedEventId || selectedFiles.length === 0) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!selectedEventId || selectedFiles.length === 0}
        >
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  form: {
    padding: 16,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  picker: {
    gap: 8,
  },
  eventOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  eventOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  eventOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  segment: {
    flex: 1,
    padding: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#3b82f6',
  },
  segmentText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailList: {
    maxHeight: 120,
  },
  thumbnail: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

