'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Upload, Camera, Loader2, User, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Si le profil n'existe pas encore, on crée un profil vide
      if (error && error.code === 'PGRST116') {
        // Profil n'existe pas, on initialise avec des valeurs vides
        setDisplayName('');
        setBio('');
        setLocation('');
        setWebsite('');
        setAvatarUrl('');
      } else if (error) {
        throw error;
      } else if (profile) {
        const p = profile as any;
        setDisplayName(p.display_name || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setWebsite(p.website || '');
        setAvatarUrl(p.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }


  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar must be less than 5MB',
        type: 'error',
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        type: 'error',
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadAvatar() {
    if (!avatarFile || !userId) return null;

    setUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar',
        type: 'error',
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!userId) return;

    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        }
      }

      const { data: savedProfile, error } = await (supabase
        .from('profiles') as any)
        .upsert({
          id: userId,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          avatar_url: newAvatarUrl || null,
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Profil mis à jour avec succès',
        type: 'success',
      });

      router.push(`/u/${userId}`);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save profile',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-20 pb-8 md:pt-24 md:pb-12 max-w-2xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const currentAvatarUrl = avatarPreview || avatarUrl;

  return (
    <div className="container mx-auto px-4 pt-20 pb-8 md:pt-24 md:pb-12 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/u/${userId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Edit Profile</h1>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="glass-card p-8 mb-6">
        <div className="flex flex-col items-center">
          <div className="relative group">
            <Avatar 
              src={currentAvatarUrl}
              name={displayName || 'User'}
              size="xl"
              className="w-32 h-32"
            />
            
            {/* Upload overlay */}
            <label 
              htmlFor="avatar-upload"
              className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-8 h-8 text-white" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Click to upload new avatar (max 5MB)
          </p>
          
          {avatarPreview && (
            <Button
              onClick={() => {
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Cancel upload
            </Button>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className="glass-card p-8 space-y-6">
        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Display Name
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Bio
          </label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Parlez-nous de vous..."
            maxLength={500}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length}/500
          </p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Localisation
          </label>
          <LocationInput
            value={location}
            onChange={setLocation}
            placeholder="Ville, Pays"
            maxLength={100}
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Site web
          </label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            type="url"
            maxLength={200}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-8">
        <Button
          onClick={handleSave}
          disabled={saving || uploadingAvatar}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          size="lg"
        >
          {saving || uploadingAvatar ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {uploadingAvatar ? 'Uploading avatar...' : 'Saving...'}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        
        <Link href={`/u/${userId}`}>
          <Button variant="outline" size="lg" disabled={saving || uploadingAvatar}>
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}

