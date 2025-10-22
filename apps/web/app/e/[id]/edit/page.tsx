'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, FileText, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
  });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !data) throw error || new Error('Event not found');

      const eventData = data as any;

      // Check if user is owner or co-organizer
      const { data: memberData } = await supabase
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      const isOwner = eventData.owner_id === user.id;
      const isCoOrganizer = memberData && (memberData as any).role === 'co-organizer';
      
      if (!isOwner && !isCoOrganizer) {
        alert('You are not authorized to edit this event');
        router.push(`/e/${eventId}`);
        return;
      }

      setFormData({
        title: eventData.title,
        description: eventData.description || '',
        date: eventData.date ? new Date(eventData.date).toISOString().slice(0, 16) : '',
        location: eventData.location || '',
      });
    } catch (error) {
      console.error('Error loading event:', error);
      alert('Error loading event');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await (supabase
        .from('events') as any)
        .update({
          title: formData.title,
          description: formData.description || null,
          date: formData.date ? new Date(formData.date).toISOString() : null,
          location: formData.location || null,
        })
        .eq('id', eventId);

      if (error) throw error;

      router.push(`/e/${eventId}`);
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert('Error updating event: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await (supabase.from('events') as any).delete().eq('id', eventId);

      if (error) throw error;

      alert('Event deleted successfully');
      router.push('/');
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert('Error deleting event: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative container mx-auto px-4 pt-20 sm:pt-24 md:pt-28 pb-8 md:pb-12 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/e/${eventId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Modifier l'événement
          </h1>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={200}
                placeholder="Mariage de Marie et Jean"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  placeholder="Décrivez votre événement..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date & Location Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date et heure</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <LocationInput
                  id="location"
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  maxLength={500}
                  placeholder="Paris, France"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={saving || !formData.title} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
              <Link href={`/e/${eventId}`}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50/60 dark:bg-red-950/30 backdrop-blur-2xl border border-red-200 dark:border-red-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-red-900 dark:text-red-100 mb-2">Zone dangereuse</h2>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                La suppression de cet événement est irréversible. Toutes les photos, vidéos et données associées seront définitivement supprimées.
              </p>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer l'événement
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

