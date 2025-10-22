'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, Loader2, AlertCircle, Crown, Users, Search, X, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from './ui/toast';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';

interface InviteMembersDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded?: () => void;
  currentMemberIds: string[];
}

export function InviteMembersDialog({
  eventId,
  isOpen,
  onClose,
  onMemberAdded,
  currentMemberIds,
}: InviteMembersDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'participant' | 'co-organizer'>('participant');
  const [sendInvitation, setSendInvitation] = useState(true); // Envoyer invitation par défaut
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null); // null = pas encore vérifié
  const { toast } = useToast();

  // Autocomplete states
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load suggestions based on current input
  const loadSuggestions = useCallback(async (query: string, type: 'name' | 'email') => {
    if (query.length < 2) {
      if (type === 'name') setNameSuggestions([]);
      else setEmailSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const suggestions: any[] = [];

      // Search in existing members of other events
      const { data: existingMembers } = await supabase
        .from('event_members')
        .select(`
          name,
          email,
          events(id, title)
        `)
        .neq('event_id', eventId)
        .or(`${type}.ilike.%${query}%`);

      // Add existing members
      if (existingMembers) {
        existingMembers.forEach((member: any) => {
          suggestions.push({
            name: member.name,
            email: member.email,
            source: 'existing_member',
            eventTitle: member.events?.title
          });
        });
      }

      // For now, only search in existing event members
      // This avoids complex auth queries that require admin permissions

      // Remove duplicates and filter out current event members
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.email === suggestion.email)
        )
        .filter(suggestion => !currentMemberIds.includes(suggestion.email))
        .slice(0, 5); // Limit to 5 suggestions

      if (type === 'name') {
        setNameSuggestions(uniqueSuggestions);
      } else {
        setEmailSuggestions(uniqueSuggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback: just search in event_members
      try {
        const { data: existingMembers } = await supabase
          .from('event_members')
          .select('name, email')
          .neq('event_id', eventId)
          .ilike(type, `%${query}%`)
          .limit(5);

        const suggestions = (existingMembers || [])
          .filter((member: any) => !currentMemberIds.includes(member.email))
          .map((member: any) => ({
            name: member.name,
            email: member.email,
            source: 'existing_member'
          }));

        if (type === 'name') {
          setNameSuggestions(suggestions);
        } else {
          setEmailSuggestions(suggestions);
        }
      } catch (fallbackError) {
        console.error('Fallback suggestions failed:', fallbackError);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }, [eventId, currentMemberIds]);

  function handleSuggestionSelect(suggestion: any) {
    setName(suggestion.name);
    setEmail(suggestion.email);
    setNameSuggestions([]);
    setEmailSuggestions([]);
    setShowNameSuggestions(false);
    setShowEmailSuggestions(false);
  }

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (value.length >= 2) {
      // Delay the suggestions loading to avoid setState during render
      setTimeout(() => {
        loadSuggestions(value, 'name');
        setShowNameSuggestions(true);
      }, 0);
    } else {
      setShowNameSuggestions(false);
      setNameSuggestions([]);
    }
  }, [loadSuggestions]);

  const handleEmailChange = useCallback(async (value: string) => {
    setEmail(value);
    setUserExists(null); // Reset
    
    if (value.length >= 2) {
      // Delay the suggestions loading to avoid setState during render
      setTimeout(() => {
        loadSuggestions(value, 'email');
        setShowEmailSuggestions(true);
      }, 0);
      
      // Check if user exists in profiles
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', value)
          .single();
        
        setUserExists(!!data);
      }
    } else {
      setShowEmailSuggestions(false);
      setEmailSuggestions([]);
    }
  }, [loadSuggestions]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      setError('Nom et email sont requis');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email invalide');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      // Check if email already exists in this event
      const { data: existingMember } = await supabase
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', email)
        .single();

      if (existingMember) {
        setError('Cette personne est déjà membre de l\'événement');
        setAdding(false);
        return;
      }

      // Use the SQL function to add member with token
      const { data: memberData, error: addError } = await (supabase as any).rpc('add_event_member', {
        p_event_id: eventId,
        p_name: name,
        p_email: email,
        p_role: role
      });

      if (addError) throw addError;

      const newMemberId = memberData;

      // Send invitation if requested
      if (sendInvitation && newMemberId) {
        try {
          const response = await fetch('/api/send-invitations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId,
              memberIds: [newMemberId],
              skipPhotoCheck: true, // Envoyer même sans photos taggées
            }),
          });

          if (response.ok) {
            toast({
              type: 'success',
              title: userExists ? 'Participant ajouté et notifié' : 'Invitation envoyée',
              description: userExists 
                ? `${name} a été notifié par email.`
                : `${name} a reçu une invitation pour créer son compte.`,
            });
          } else {
            // Member added but email failed
            toast({
              type: 'warning',
              title: 'Membre ajouté',
              description: `${name} a été ajouté mais l'email n'a pas pu être envoyé.`,
            });
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          toast({
            type: 'warning',
            title: 'Membre ajouté',
            description: `${name} a été ajouté mais l'email n'a pas pu être envoyé.`,
          });
        }
      } else {
        // No email sent
        toast({
          type: 'success',
          title: 'Membre ajouté',
          description: `${name} a été ajouté à l'événement.`,
        });
      }

      // Reset form
      setName('');
      setEmail('');
      setRole('participant');
      setSendInvitation(true);
      setUserExists(null);
      
      // Callback
      if (onMemberAdded) {
        onMemberAdded();
      }

      // Close dialog
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error('Error adding member:', err);
      setError('Erreur lors de l\'ajout du membre');
      
      // Show error toast
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible d\'ajouter ce membre. Veuillez réessayer.',
      });
    } finally {
      setAdding(false);
    }
  }

  const handleClose = () => {
    setName('');
    setEmail('');
    setRole('participant');
    setSendInvitation(true);
    setUserExists(null);
    setError(null);
    setNameSuggestions([]);
    setEmailSuggestions([]);
    setShowNameSuggestions(false);
    setShowEmailSuggestions(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-4 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Inviter un participant</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Ajoutez quelqu'un à l'événement pour qu'il puisse voir toutes les photos et être taggé.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddMember} className="space-y-5 px-8 py-6">
          {/* Name */}
          <div className="relative">
            <Label htmlFor="member-name" className="text-sm font-medium">Nom complet *</Label>
            <div className="relative mt-2">
              <Input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Marie Dupont"
                required
                className="pr-10"
                onFocus={() => nameSuggestions.length > 0 && setShowNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            {/* Name suggestions dropdown */}
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {nameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-accent/50 border-b border-border last:border-b-0 flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{suggestion.name}</div>
                      <div className="text-sm text-muted-foreground">{suggestion.email}</div>
                      {suggestion.eventTitle && (
                        <div className="text-xs text-blue-600">
                          Membre de "{suggestion.eventTitle}"
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="relative">
            <Label htmlFor="member-email" className="text-sm font-medium">Email *</Label>
            <div className="relative mt-2">
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="marie@example.com"
                required
                className="pr-10"
                onFocus={() => emailSuggestions.length > 0 && setShowEmailSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            {/* Email suggestions dropdown */}
            {showEmailSuggestions && emailSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {emailSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-accent/50 border-b border-border last:border-b-0 flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{suggestion.name}</div>
                      <div className="text-sm text-muted-foreground">{suggestion.email}</div>
                      {suggestion.eventTitle && (
                        <div className="text-xs text-blue-600">
                          Membre de "{suggestion.eventTitle}"
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* User exists indicator */}
            {userExists !== null && (
              <div className={cn(
                "flex items-center gap-2 mt-2 text-xs p-2 rounded-lg",
                userExists 
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              )}>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {userExists 
                    ? "✅ Cette personne a déjà un compte Memoria"
                    : "📧 Cette personne devra créer un compte"}
                </span>
              </div>
            )}
          </div>

          {/* Send Invitation Toggle */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <Label htmlFor="send-invitation" className="text-sm font-semibold cursor-pointer">
                    Envoyer l'invitation maintenant
                  </Label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {userExists === true && "Notification : 'Vous avez été ajouté à un événement'"}
                  {userExists === false && "Invitation : 'Créez votre compte pour rejoindre'"}
                  {userExists === null && "Un email sera envoyé selon le statut du compte"}
                </p>
              </div>
              <Switch
                id="send-invitation"
                checked={sendInvitation}
                onCheckedChange={setSendInvitation}
              />
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <Label className="mb-3 block text-sm font-medium">Rôle</Label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/5"
                style={{ borderColor: role === 'participant' ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
              >
                <input
                  type="radio"
                  name="role"
                  value="participant"
                  checked={role === 'participant'}
                  onChange={(e) => setRole(e.target.value as 'participant')}
                  className="w-4 h-4 mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">Participant</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Voit uniquement ses médias taggués, peut uploader
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/5"
                style={{ borderColor: role === 'co-organizer' ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
              >
                <input
                  type="radio"
                  name="role"
                  value="co-organizer"
                  checked={role === 'co-organizer'}
                  onChange={(e) => setRole(e.target.value as 'co-organizer')}
                  className="w-4 h-4 mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Co-organisateur</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Peut taguer, gérer les membres, voir tous les médias
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} disabled={adding} className="min-w-[100px]">
            Annuler
          </Button>
          <Button onClick={handleAddMember} disabled={adding} className="min-w-[120px]">
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Ajouter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}