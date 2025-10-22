'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ArrowLeft, MapPin, Link as LinkIcon, Calendar, Edit, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getUserDisplayName } from '@/lib/userHelpers';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setLoading(true);

      // Check if this is the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwnProfile(user?.id === userId);
      if (user?.id === userId) {
        setUserEmail(user.email || null);
      }

      // Load profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="container mx-auto px-4 pt-20 pb-8 md:pt-24 md:pb-12 max-w-4xl">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Profil introuvable</h1>
            <p className="text-muted-foreground mb-8">Ce profil n'existe pas ou a été supprimé.</p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au dashboard
              </Button>
            </Link>
          </div>
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

      <div className="relative container mx-auto px-4 pt-20 pb-8 md:pt-24 md:pb-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          
          {isOwnProfile && (
            <Link href="/profile/edit">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Edit className="w-4 h-4 mr-2" />
                Modifier le profil
              </Button>
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
          {/* Cover Image Placeholder */}
          <div className="h-32 md:h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="relative px-6 md:px-8 pb-8">
            {/* Avatar */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-xl opacity-30" />
                <Avatar 
                  src={profile.avatar_url}
                  name={getUserDisplayName({ display_name: profile.display_name, email: userEmail })}
                  size="xl"
                  className="w-32 h-32 md:w-40 md:h-40 border-4 border-white dark:border-slate-900 shadow-2xl relative"
                />
              </div>
            </div>

            {/* Name & Bio */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                  {getUserDisplayName({ display_name: profile.display_name, email: userEmail })}
                </h1>
                {userEmail && isOwnProfile && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{userEmail}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {profile.bio}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-6 pt-4">
                {profile.location && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold">{profile.location}</span>
                  </div>
                )}

                {profile.website && (
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">Site web</span>
                  </a>
                )}

                {profile.created_at && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-semibold">
                      Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional sections could go here (events, photos, etc.) */}
      </div>
    </div>
  );
}

