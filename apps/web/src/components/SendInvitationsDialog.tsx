'use client';

import { useState, useEffect } from 'react';
import type { EventMember } from '@memoria/ui';
import { supabase } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendInvitationsDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

interface MemberWithPhotos extends EventMember {
  photo_count?: number;
}

export function SendInvitationsDialog({
  eventId,
  isOpen,
  onClose,
  onSent,
}: SendInvitationsDialogProps) {
  const [members, setMembers] = useState<MemberWithPhotos[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setResults([]);
      setError(null);
    }
  }, [isOpen, eventId]);

  async function loadMembers() {
    try {
      setLoading(true);

      // Load members with photo counts
      const { data: membersData, error: membersError } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .neq('role', 'owner') // Don't send invitations to owners
        .order('name');

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Count photos for each member
      const membersWithPhotos: MemberWithPhotos[] = await Promise.all(
        (membersData as any[]).map(async (member: any) => {
          const { count } = await supabase
            .from('media_tags')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', member.id);

          return {
            ...member,
            photo_count: count || 0,
          };
        })
      );

      // Filter members who have photos and haven't joined yet
      const eligibleMembers = membersWithPhotos.filter(
        (m) => m.photo_count && m.photo_count > 0 && !m.joined_at
      );

      setMembers(eligibleMembers);

      // Pre-select members who haven't been sent invitations yet
      const toSelect = eligibleMembers
        .filter((m) => !m.invitation_sent_at)
        .map((m) => m.id);
      setSelectedIds(new Set(toSelect));
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (selectedIds.size === 0) return;

    try {
      setSending(true);
      setError(null);

      const response = await fetch('/api/send-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          memberIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      setResults(data.results || []);

      // Reload members
      await loadMembers();

      // Clear selection
      setSelectedIds(new Set());

      if (onSent) {
        onSent();
      }
    } catch (err) {
      console.error('Error sending invitations:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  }

  const toggleSelection = (memberId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedIds(newSelection);
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-4 md:mx-auto max-h-[85vh] md:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">Envoyer les invitations</DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Envoyez un email aux nouveaux participants pour qu'ils créent leur compte et accèdent à l'événement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-8 py-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && members.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-500" />
              <p className="font-semibold text-lg mb-2">
                Aucune personne éligible pour recevoir une invitation
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-left space-y-2 max-w-md mx-auto">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📋 Pour envoyer des invitations :
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-decimal">
                  <li>Ajoutez des membres à l'événement ✅</li>
                  <li>Uploadez des médias (photos/vidéos)</li>
                  <li><strong>Taguez vos invités dans les médias</strong> 🏷️</li>
                  <li>Ensuite, envoyez les invitations ici</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                  💡 Une invitation contient le nombre de photos de la personne. Il faut donc d'abord les taguer !
                </p>
              </div>
            </div>
          )}

          {!loading && members.length > 0 && (
            <>
              {/* Results */}
              {results.length > 0 && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Résultats :</p>
                    <div className="flex gap-4 text-sm">
                      {successCount > 0 && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {successCount} envoyé{successCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {failCount > 0 && (
                        <span className="text-destructive flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          {failCount} échec{failCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {selectedIds.size} personne{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                </p>

                {members.map((member) => {
                  const isSelected = selectedIds.has(member.id);

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30 hover:bg-accent/5'
                      )}
                      onClick={() => toggleSelection(member.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {member.photo_count} photo{member.photo_count! > 1 ? 's' : ''}
                        </p>
                      </div>

                      {member.invitation_sent_at && (
                        <span className="text-xs text-orange-600">
                          Déjà invité
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={sending} className="min-w-[100px]">
            {results.length > 0 ? 'Fermer' : 'Annuler'}
          </Button>
          {members.length > 0 && (
            <Button onClick={handleSend} disabled={selectedIds.size === 0 || sending} className="min-w-[140px]">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
