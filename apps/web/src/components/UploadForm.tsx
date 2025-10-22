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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;

export function UploadForm() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadUserEvents();
  }, []);

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

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const type = file.type.startsWith('video/') ? 'video' : 'photo';

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

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      router.push(`/e/${selectedEventId}`);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploading(false);
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
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-muted-foreground">Uploading... {progress}%</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={uploading || files.length === 0 || !selectedEventId}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </form>
  );
}

