/**
 * Upload queue with retry logic
 * TODO: Implement background upload and better persistence
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabaseClient';
import type { UploadQueueItem } from '@memoria/ui';

const QUEUE_KEY = 'upload_queue';
const MAX_RETRIES = 3;

class UploadQueue {
  private queue: UploadQueueItem[] = [];
  private processing = false;
  private startTime: number | null = null;
  private totalSize = 0;
  private uploadedBytes = 0;

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  }

  async addToQueue(params: {
    eventId: string;
    uri: string;
    type: 'photo' | 'video';
    visibility: 'public' | 'private';
  }) {
    const item: UploadQueueItem = {
      id: crypto.randomUUID(),
      eventId: params.eventId,
      uri: params.uri,
      type: params.type,
      visibility: params.visibility,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(item);
    await this.saveQueue();
    return item;
  }

  async removeFromQueue(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    await this.saveQueue();
  }

  async updateItem(id: string, updates: Partial<UploadQueueItem>) {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      await this.saveQueue();
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    this.startTime = Date.now();
    this.uploadedBytes = 0;

    const pendingItems = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'failed'
    );

    // Calculate total size for progress tracking
    this.totalSize = 0;
    for (const item of pendingItems) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(item.uri);
        if (fileInfo.exists) {
          this.totalSize += fileInfo.size || 0;
        }
      } catch (error) {
        console.error('Error getting file size:', error);
      }
    }

    for (const item of pendingItems) {
      try {
        await this.uploadItem(item);
      } catch (error) {
        console.error('Error uploading item:', error);
      }
    }

    this.processing = false;
    this.startTime = null;
    this.totalSize = 0;
    this.uploadedBytes = 0;
  }

  private async uploadItem(item: UploadQueueItem) {
    if (item.retryCount >= MAX_RETRIES) {
      await this.updateItem(item.id, {
        status: 'failed',
        error: 'Max retries exceeded',
      });
      return;
    }

    try {
      await this.updateItem(item.id, { status: 'uploading', progress: 0 });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Read file
      const fileInfo = await FileSystem.getInfoAsync(item.uri);
      if (!fileInfo.exists) throw new Error('File not found');

      // Get file extension
      const uriParts = item.uri.split('.');
      const fileExt = uriParts[uriParts.length - 1];
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Update progress with file size tracking
      const fileSize = fileInfo.size || 0;
      this.uploadedBytes += fileSize;
      
      // Calculate overall progress
      const overallProgress = this.totalSize > 0 
        ? Math.round((this.uploadedBytes / this.totalSize) * 100)
        : 0;

      await this.updateItem(item.id, { progress: overallProgress });

      // Upload to storage
      const fileContent = await FileSystem.readAsStringAsync(item.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, decode(fileContent), {
          contentType: item.type === 'photo' ? 'image/jpeg' : 'video/mp4',
        });

      if (uploadError) throw uploadError;

      await this.updateItem(item.id, { progress: Math.min(overallProgress + 10, 90) });

      // Create media record
      const { error: dbError } = await supabase.from('media').insert({
        event_id: item.eventId,
        user_id: user.id,
        type: item.type,
        storage_path: fileName,
        visibility: item.visibility,
      });

      if (dbError) throw dbError;

      await this.updateItem(item.id, { status: 'completed', progress: 100 });

      // Remove from queue after success
      setTimeout(() => this.removeFromQueue(item.id), 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      await this.updateItem(item.id, {
        status: 'failed',
        error: error.message,
        retryCount: item.retryCount + 1,
      });
    }
  }

  getQueue() {
    return [...this.queue];
  }

  getUploadStats() {
    const pendingItems = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'failed'
    );
    const completedItems = this.queue.filter(
      (item) => item.status === 'completed'
    );

    const elapsedTime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const uploadSpeed = elapsedTime > 0 && this.uploadedBytes > 0 
      ? this.uploadedBytes / elapsedTime 
      : 0;

    return {
      totalItems: this.queue.length,
      pendingItems: pendingItems.length,
      completedItems: completedItems.length,
      isProcessing: this.processing,
      elapsedTime,
      uploadSpeed,
      totalSize: this.totalSize,
      uploadedBytes: this.uploadedBytes,
      progress: this.totalSize > 0 ? Math.round((this.uploadedBytes / this.totalSize) * 100) : 0
    };
  }

}

// Helper to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const uploadQueue = new UploadQueue();

// Initialize queue on import
uploadQueue.initialize();

