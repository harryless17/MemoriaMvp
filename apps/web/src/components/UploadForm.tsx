'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@memoria/ui';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Upload, X } from 'lucide-react';
import { getUserDisplayName } from '@/lib/userHelpers';
import { useToastContext } from './ToastProvider';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;

export function UploadForm() {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);

  useEffect(() => {
    loadUserEvents();
  }, []);

  // Timer calculation functions
  const calculateUploadSpeed = (bytesUploaded: number, timeElapsed: number) => {
    return bytesUploaded / (timeElapsed / 1000); // bytes per second
  };

  const calculateEstimatedTime = (totalBytes: number, bytesUploaded: number, speed: number) => {
    if (speed === 0) return null;
    const remainingBytes = totalBytes - bytesUploaded;
    return remainingBytes / speed; // seconds
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
  };

  async function loadUserEvents() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load events where user is owner or member
    const { data: memberEvents } = await supabase
      .from('event_members')
      .select(`
        event_id, 
        events(*)
      `)
      .eq('user_id', user.id);

    const { data: ownedEvents } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', user.id);

    const allEvents = new Map<string, any>();

    (ownedEvents as any)?.forEach((e: any) => allEvents.set(e.id, e));
    memberEvents?.forEach((m: any) => {
      if (m.events) allEvents.set(m.events.id, m.events);
    });

    // Get owner names for all events
    const eventIds = Array.from(allEvents.keys());
    const { data: ownerData } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', Array.from(allEvents.values()).map(e => e.owner_id).filter(Boolean));

    // Add owner info to events
    const eventsWithOwners = Array.from(allEvents.values()).map((event: any) => {
      const owner = (ownerData as any)?.find((o: any) => o.id === event.owner_id);
      return {
        ...event,
        owner: {
          id: owner?.id,
          display_name: owner?.display_name
        }
      };
    });

    setEvents(eventsWithOwners.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Filter by size
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large. Max size is 50MB.`);
        return false;
      }
      return true;
    });

    // Limit to MAX_FILES
    const newFiles = [...files, ...validFiles].slice(0, MAX_FILES);
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || files.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    setProgress(0);
    setCurrentFileIndex(0);
    setUploadStartTime(Date.now());
    setEstimatedTimeRemaining(null);
    setUploadSpeed(0);

    showInfo('Upload démarré', `Début de l'upload de ${files.length} fichiers...`);

    try {
      // Calculate total size for progress tracking
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      let uploadedBytes = 0;
      const startTime = Date.now();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const type = file.type.startsWith('video/') ? 'video' : 'photo';

        const fileStartTime = Date.now();

        // Upload file to Storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create media record
        await (supabase.from('media') as any).insert({
          event_id: selectedEventId,
          user_id: user.id,
          type,
          storage_path: fileName,
        });

        // Update progress and timers
        uploadedBytes += file.size;
        const currentTime = Date.now();
        const timeElapsed = currentTime - startTime;
        const fileTimeElapsed = currentTime - fileStartTime;
        
        // Calculate speed and estimated time
        const speed = calculateUploadSpeed(uploadedBytes, timeElapsed);
        setUploadSpeed(speed);
        
        const estimatedTime = calculateEstimatedTime(totalSize, uploadedBytes, speed);
        setEstimatedTimeRemaining(estimatedTime);

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      showSuccess('Upload terminé', `${files.length} fichiers uploadés avec succès !`);
      router.push(`/e/${selectedEventId}`);
    } catch (error) {
      console.error('Error uploading:', error);
      showError('Échec de l\'upload', 'Erreur lors de l\'upload des fichiers. Veuillez réessayer.');
    } finally {
      setUploading(false);
      setUploadStartTime(null);
      setEstimatedTimeRemaining(null);
      setUploadSpeed(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="event" className="block text-sm font-medium mb-2">
          Événement
        </label>
        <select
          id="event"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
          required
        >
          <option value="">Choisir un événement...</option>
          {events.map((event) => {
            const eventData = event as any;
            const ownerName = getUserDisplayName({ 
              display_name: eventData.owner?.display_name, 
              email: eventData.owner?.email 
            });
            return (
              <option key={event.id} value={event.id}>
                {event.title} - Organisé par {ownerName}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Files</label>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-12 h-12 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click to upload photos or videos
            </span>
            <span className="text-xs text-muted-foreground">
              Max {MAX_FILES} files, 50MB each
            </span>
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} file(s) selected</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-border rounded-md"
              >
                <span className="text-sm truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-2 p-1 hover:bg-accent rounded"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Upload du fichier {currentFileIndex} sur {files.length}
            </span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Temps restant mis en évidence */}
          {estimatedTimeRemaining && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">
                ⏱️ Temps restant: {formatTime(estimatedTimeRemaining)}
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Vous pouvez fermer cette page, l'upload continuera en arrière-plan
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Vitesse: {formatSpeed(uploadSpeed)}</span>
              <span>Temps écoulé: {uploadStartTime ? Math.round((Date.now() - uploadStartTime) / 1000) : 0}s</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {currentFileIndex > 0 && `${Math.round((currentFileIndex / files.length) * 100)}% des fichiers traités`}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={uploading || files.length === 0 || !selectedEventId}>
        {uploading ? 'Upload en cours...' : 'Uploader'}
      </Button>
    </form>
  );
}

