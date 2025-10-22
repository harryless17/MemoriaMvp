'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
// Types locaux
interface EventMember {
  id: string;
  event_id: string;
  user_id?: string;
  name: string;
  email: string;
  role: 'owner' | 'co-organizer' | 'participant';
  invitation_token?: string;
  joined_at?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
  owner_id: string;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [member, setMember] = useState<EventMember | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [photoCount, setPhotoCount] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    try {
      setLoading(true);
      setError(null);

      // Load member by token
      const { data: memberData, error: memberError } = await supabase
        .from('event_members')
        .select('*')
        .eq('invitation_token', token)
        .single();

      if (memberError || !memberData) {
        setError('Invitation invalide ou expirée');
        setLoading(false);
        return;
      }

      const member = memberData as any;

      // Check if already joined
      if (member.user_id && member.joined_at) {
        // Already has account, redirect to login
        router.push(`/login?redirect=/e/${member.event_id}`);
        return;
      }

      setMember(member);
      setName(member.name);
      setEmail(member.email);

      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', member.event_id)
        .single();

      if (eventData) {
        setEvent(eventData);
      }

      // Count photos
      const { count } = await supabase
        .from('media_tags')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', member.id);

      setPhotoCount(count || 0);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Erreur lors du chargement de l\'invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    
    if (!member || !event) return;

    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // Create account with email auto-confirmation (for invitations)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            display_name: name,
          },
          emailRedirectTo: `${window.location.origin}/e/${event.id}`,
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Update member with user_id and joined_at
      const { error: updateError } = await (supabase
        .from('event_members') as any)
        .update({
          user_id: authData.user.id,
          joined_at: new Date().toISOString(),
          name: name,
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      // Create profile
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .insert({
          id: authData.user.id,
          display_name: name,
        });

      // Profile might already exist from auth trigger, that's ok
      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('Profile error:', profileError);
      }

      // Check if email is confirmed
      if (authData.user.email_confirmed_at) {
        // Email already confirmed, redirect to event
        router.push(`/e/${event.id}`);
      } else {
        // Email not confirmed, show message and redirect to login
        alert('✅ Compte créé ! Vérifiez votre email et cliquez sur le lien de confirmation, puis reconnectez-vous.');
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Erreur lors de la création du compte');
    } finally {
      setCreating(false);
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

  if (error && !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 px-4">
        <div className="max-w-md w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation invalide</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button 
            onClick={() => router.push('/login')} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 px-4 py-8 md:py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 md:w-16 h-14 md:h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <ImageIcon className="w-7 md:w-8 h-7 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Bienvenue sur Memoria</h1>
          <p className="text-sm md:text-base text-muted-foreground px-4">
            {event ? `Invitation pour ${event.title}` : 'Créez votre compte pour accéder à vos photos'}
          </p>
        </div>

        {/* Photo count card */}
        {photoCount > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-center text-white mb-6 shadow-lg">
            <p className="text-5xl md:text-6xl font-bold mb-2">{photoCount}</p>
            <p className="text-base md:text-lg opacity-90">
              {photoCount === 1 ? 'photo vous attend' : 'photos vous attendent'}
            </p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleCreateAccount} className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-9"
                  placeholder="Marie Dupont"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
                  className="pl-9 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9"
                  placeholder="Au moins 6 caractères"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création du compte...
                </>
              ) : (
                'Créer mon compte et voir mes photos'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            En créant un compte, vous acceptez nos conditions d'utilisation.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Vous avez déjà un compte ?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
