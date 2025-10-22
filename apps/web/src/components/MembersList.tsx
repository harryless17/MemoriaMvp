'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { EventMember } from '@memoria/ui';
import { getInitials } from '@memoria/ui';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { useToast } from './ui/toast';
import { UserMinus, UserCheck, Clock, UserX, Crown, ArrowUp } from 'lucide-react';
import { getUserDisplayName } from '@/lib/userHelpers';

interface MembersListProps {
  eventId: string;
  eventOwnerId: string;
  onMemberRemoved?: () => void;
  members?: EventMember[]; // Optional: if provided, use these instead of loading
}

export function MembersList({ eventId, eventOwnerId, onMemberRemoved, members: propMembers }: MembersListProps) {
  const [members, setMembers] = useState<EventMember[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // If members are provided as props, use them directly
    if (propMembers) {
      setMembers(propMembers);
      setLoading(false);
    } else {
      loadMembers();
    }
    loadCurrentUser();

    // Realtime subscription (only if not using prop members)
    if (!propMembers) {
      const channel = supabase
        .channel(`event_members_list:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_members',
            filter: `event_id=eq.${eventId}`,
          },
          () => loadMembers()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [eventId, propMembers]);

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function loadMembers() {
    setLoading(true);
    try {
      // Load members
      const { data: membersData } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(membersData.map((m: any) => m.user_id).filter(Boolean))];

      // Load profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      // Merge members with their profiles
      const membersWithProfiles = membersData.map((member: any) => ({
        ...member,
        user: profilesData?.find((p: any) => p.id === member.user_id) || null
      }));

      setMembers(membersWithProfiles as any);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(memberId: string) {
    if (!confirm('Promouvoir ce membre en co-organisateur ? Il pourra taguer et gérer les membres.')) return;

    setPromotingId(memberId);
    try {
      const { error } = await (supabase
        .from('event_members') as any)
        .update({ role: 'co-organizer' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        type: 'success',
        title: 'Membre promu',
        description: 'Le membre est maintenant co-organisateur.',
      });

      loadMembers();
    } catch (error) {
      console.error('Error promoting member:', error);
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de promouvoir ce membre.',
      });
    } finally {
      setPromotingId(null);
    }
  }

  async function handleDemote(memberId: string) {
    if (!confirm('Rétrograder ce co-organisateur en participant ?')) return;

    setPromotingId(memberId);
    try {
      const { error } = await (supabase
        .from('event_members') as any)
        .update({ role: 'participant' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        type: 'success',
        title: 'Rôle modifié',
        description: 'Le membre est maintenant participant.',
      });

      loadMembers();
    } catch (error) {
      console.error('Error demoting member:', error);
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de modifier le rôle.',
      });
    } finally {
      setPromotingId(null);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) return;

    setRemovingId(memberId);
    try {
      const { error } = await (supabase.from('event_members') as any)
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        type: 'success',
        title: 'Membre retiré',
        description: 'Le membre a été retiré avec succès.',
      });

      onMemberRemoved?.();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de retirer ce membre.',
      });
    } finally {
      setRemovingId(null);
    }
  }

  const getMemberStatus = (member: EventMember) => {
    if (member.user_id && member.joined_at) {
      return { icon: UserCheck, label: 'Inscrit', color: 'text-green-600' };
    }
    if (member.invitation_sent_at && !member.joined_at) {
      return { icon: Clock, label: 'Invitation envoyée', color: 'text-orange-600' };
    }
    return { icon: UserX, label: 'Non invité', color: 'text-gray-600' };
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement...</div>;
  }

  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Aucun membre pour le moment
      </div>
    );
  }

  const isOwner = currentUser?.id === eventOwnerId;

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const status = getMemberStatus(member);
        const StatusIcon = status.icon;
        const canRemove = isOwner && member.role !== 'owner';
        const canPromote = isOwner && member.role === 'participant';
        const canDemote = isOwner && member.role === 'co-organizer';

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
          >
            {/* Avatar */}
            <Avatar 
              src={member.user?.avatar_url}
              name={getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}
              size="md"
              className="rounded-full flex-shrink-0"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}</p>
                {member.role === 'owner' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Organisateur
                  </span>
                )}
                {member.role === 'co-organizer' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Co-org
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                <span>{status.label}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              {canPromote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePromote(member.id)}
                  disabled={promotingId === member.id}
                  title="Promouvoir en co-organisateur"
                >
                  <ArrowUp className="w-4 h-4 text-blue-600" />
                </Button>
              )}
              {canDemote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDemote(member.id)}
                  disabled={promotingId === member.id}
                  title="Rétrograder en participant"
                >
                  <ArrowUp className="w-4 h-4 rotate-180 text-orange-600" />
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(member.id)}
                  disabled={removingId === member.id}
                  title="Retirer"
                >
                  <UserMinus className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
