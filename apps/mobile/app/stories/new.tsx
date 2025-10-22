import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

export default function CreateStoryScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadStory = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Upload image to storage
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Create media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          type: 'photo',
          storage_path: filePath,
          visibility: 'public',
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      // Create story record (expires in 24h)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_id: mediaData.id,
          caption: caption.trim() || null,
          expires_at: expiresAt.toISOString(),
        });

      if (storyError) throw storyError;

      Alert.alert('Success', 'Story created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating story:', error);
      Alert.alert('Error', 'Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Story</Text>
        <View style={{ width: 24 }} />
      </View>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={() => setImageUri(null)}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectContainer}>
          <TouchableOpacity style={styles.selectButton} onPress={takePhoto}>
            <Ionicons name="camera" size={48} color="#8b5cf6" />
            <Text style={styles.selectButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectButton} onPress={pickImage}>
            <Ionicons name="images" size={48} color="#8b5cf6" />
            <Text style={styles.selectButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Caption (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Add a caption..."
          placeholderTextColor="#666"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={200}
        />
        <Text style={styles.hint}>{caption.length}/200</Text>

        <TouchableOpacity
          style={[styles.uploadButton, (!imageUri || uploading) && styles.uploadButtonDisabled]}
          onPress={uploadStory}
          disabled={!imageUri || uploading}
        >
          {uploading ? (
            <Text style={styles.uploadButtonText}>Uploading...</Text>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Share Story (24h)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  selectContainer: {
    padding: 32,
    gap: 24,
  },
  selectButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  uploadButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  uploadButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

