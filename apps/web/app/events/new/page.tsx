'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { getUserDisplayName } from '@/lib/userHelpers';
import { Calendar, FileText, ArrowLeft, Loader2, ScanFace } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    face_recognition_enabled: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Create event
      const { data: event, error: eventError } = await (supabase
        .from('events') as any)
        .insert({
          owner_id: user.id,
          title: formData.title,
          description: formData.description || null,
          date: formData.date ? new Date(formData.date).toISOString() : null,
          location: formData.location || null,
          visibility: 'private',  // Default visibility
          face_recognition_enabled: formData.face_recognition_enabled,
          face_recognition_enabled_at: formData.face_recognition_enabled ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Get user profile (email vient de auth.users, pas de profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const userEmail = user.email || 'unknown@example.com';
      const userName = getUserDisplayName({ 
        display_name: (profile as any)?.display_name, 
        email: userEmail 
      });

      // Add creator as owner in event_members
      const { error: memberError } = await (supabase
        .from('event_members') as any)
        .insert({
          event_id: event.id,
          user_id: user.id,
          name: userName,
          email: userEmail,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        // Continue anyway, the event is created
      }

      // Save wizard state
      localStorage.setItem(`wizard_${event.id}`, JSON.stringify({
        step: 1,
        timestamp: new Date().toISOString()
      }));

      // Redirect to the new event with wizard parameter
      router.push(`/e/${event.id}?wizard=true`);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Erreur lors de la création de l\'événement');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-12 max-w-2xl">
      <Link href="/events">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Créer un événement</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title">Titre de l'événement *</Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Mariage de Marie et Jean"
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <div className="relative mt-1">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez votre événement..."
              className="pl-9 min-h-[100px]"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date">Date</Label>
          <div className="relative mt-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Lieu</Label>
          <LocationInput
            id="location"
            value={formData.location}
            onChange={(value) => setFormData({ ...formData, location: value })}
            placeholder="Paris, France"
            className="mt-1"
          />
        </div>

        {/* Face Recognition Toggle */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScanFace className="w-5 h-5 text-blue-600" />
              <div>
                <Label htmlFor="face-recognition" className="cursor-pointer">
                  Activer la reconnaissance faciale
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tagging assisté par IA pour identifier automatiquement les personnes
                </p>
              </div>
            </div>
            <Switch
              id="face-recognition"
              checked={formData.face_recognition_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, face_recognition_enabled: checked })
              }
            />
          </div>

          {formData.face_recognition_enabled && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-2">
              <p className="font-semibold text-amber-900">
                ⚠️ Informations RGPD
              </p>
              <p className="text-amber-800">
                En activant cette fonctionnalité, vous acceptez que :
              </p>
              <ul className="list-disc ml-4 text-amber-800 space-y-1">
                <li>Les visages seront détectés et analysés automatiquement</li>
                <li>Les données biométriques seront temporairement stockées</li>
                <li>Vous devez obtenir le consentement des personnes concernées</li>
                <li>Les participants peuvent demander la suppression de leurs données</li>
                <li>Les données sont supprimées lors de l'archivage de l'événement</li>
              </ul>
              <p className="text-amber-900 font-medium mt-2">
                L'identification finale nécessite toujours votre validation manuelle.
              </p>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Astuce :</strong> Après avoir créé l'événement, vous pourrez :
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
            <li>Ajouter des membres et invités</li>
            <li>Uploader des photos et vidéos</li>
            <li>Taguer les personnes dans les médias</li>
            {formData.face_recognition_enabled && (
              <li className="font-medium">
                Lancer l'analyse faciale pour identifier automatiquement les personnes
              </li>
            )}
            <li>Envoyer les invitations par email</li>
          </ul>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/events" className="flex-1">
            <Button type="button" variant="outline" className="w-full" disabled={loading}>
              Annuler
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer l\'événement'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}