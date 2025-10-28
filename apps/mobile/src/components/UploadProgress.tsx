import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uploadQueue } from '@/features/upload/queue';

interface UploadStats {
  totalItems: number;
  pendingItems: number;
  completedItems: number;
  isProcessing: boolean;
  elapsedTime: number;
  uploadSpeed: number;
  totalSize: number;
  uploadedBytes: number;
  progress: number;
}

export function UploadProgress() {
  const [stats, setStats] = useState<UploadStats>({
    totalItems: 0,
    pendingItems: 0,
    completedItems: 0,
    isProcessing: false,
    elapsedTime: 0,
    uploadSpeed: 0,
    totalSize: 0,
    uploadedBytes: 0,
    progress: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const newStats = uploadQueue.getUploadStats();
      setStats(newStats);
    };

    // Update stats immediately
    updateStats();

    // Update stats every second when processing
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const calculateEstimatedTime = () => {
    if (stats.uploadSpeed === 0 || stats.totalSize === 0) return null;
    const remainingBytes = stats.totalSize - stats.uploadedBytes;
    const estimatedSeconds = remainingBytes / stats.uploadSpeed;
    return estimatedSeconds;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (!stats.isProcessing && stats.totalItems === 0) {
    return null;
  }

  const estimatedTime = calculateEstimatedTime();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {stats.isProcessing ? 'Upload en cours...' : 'Upload terminé'}
        </Text>
        <Text style={styles.progress}>{stats.progress}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[styles.progressFill, { width: `${stats.progress}%` }]} 
        />
      </View>

      {/* Temps restant mis en évidence */}
      {estimatedTime && stats.isProcessing && (
        <View style={styles.estimatedTimeContainer}>
          <Text style={styles.estimatedTimeTitle}>⏱️ Temps restant</Text>
          <Text style={styles.estimatedTimeValue}>{formatTime(estimatedTime)}</Text>
        </View>
      )}

      {stats.isProcessing && (
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Fichiers:</Text>
            <Text style={styles.statValue}>
              {stats.completedItems} / {stats.totalItems}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Vitesse:</Text>
            <Text style={styles.statValue}>{formatSpeed(stats.uploadSpeed)}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Temps:</Text>
            <Text style={styles.statValue}>{formatTime(stats.elapsedTime)}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Taille:</Text>
            <Text style={styles.statValue}>
              {formatSize(stats.uploadedBytes)} / {formatSize(stats.totalSize)}
            </Text>
          </View>
        </View>
      )}

      {!stats.isProcessing && stats.completedItems > 0 && (
        <Text style={styles.successText}>
          ✅ {stats.completedItems} fichiers uploadés avec succès
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  stats: {
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  successText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
  },
  estimatedTimeContainer: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  estimatedTimeTitle: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
    marginBottom: 4,
  },
  estimatedTimeValue: {
    fontSize: 18,
    color: '#1e40af',
    fontWeight: 'bold',
  },
});
