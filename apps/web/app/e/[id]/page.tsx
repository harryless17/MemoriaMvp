'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
// Types locaux (pas de package @memoria/ui)
interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
  owner_id: string;
  visibility: string;
  face_recognition_enabled?: boolean;
  created_at: string;
}

interface Media {
  id: string;
  event_id: string;
  user_id: string | null;
  type: 'photo' | 'video';
  storage_path: string;
  thumb_path: string | null;
  created_at: string;
}

interface EventMember {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: 'owner' | 'co-organizer' | 'participant';
  invitation_token?: string;
  joined_at?: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
import { OptimizedMediaGrid } from '@/components/OptimizedMediaGrid';
import { Button } from '@/components/ui/button';
import { MembersList } from '@/components/MembersList';
import { InviteMembersDialog } from '@/components/InviteMembersDialog';
import { DownloadButton } from '@/components/DownloadButton';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar } from '@/components/ui/avatar';
import { EventWizard } from '@/components/EventWizard';
import { EventHealthCard } from '@/components/EventHealthCard';
import {
  Calendar,
  MapPin,
  Tag,
  Users,
  Mail,
  Upload,
  Loader2,
  AlertTriangle,
  Crown,
  UserCog,
  Edit,
  ChevronDown,
  ChevronUp,
  Search,
  MoreVertical,
  UserMinus,
  ArrowUp,
  ArrowDown,
  ScanFace,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<'owner' | 'co-organizer' | 'participant' | null>(null);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [statsKey, setStatsKey] = useState(0); // Force EventHealthCard reload

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // States for collapsible participants section
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
    loadCurrentUser();
    
    // Check if wizard should be opened
    const wizardParam = searchParams?.get('wizard');
    if (wizardParam === 'true') {
      setWizardOpen(true);
    }
  }, [eventId, searchParams]);

  // Reload stats when page becomes visible (e.g., after navigating back from /people)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setStatsKey(prev => prev + 1);
      }
    };

    const handleFocus = () => setStatsKey(prev => prev + 1);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function loadEvent() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Load event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        router.push('/events');
        return;
      }

      setEvent(eventData);

      // Get my role
      // First check if I'm the owner
      let userRole: 'owner' | 'co-organizer' | 'participant';
      
      if ((eventData as any).owner_id === user.id) {
        userRole = 'owner';
      } else {
        // Check in event_members
        const { data: memberData } = await supabase
          .from('event_members')
          .select('role')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();

        if (!memberData) {
          // Not a member and not owner
          router.push('/events');
          return;
        }

        userRole = (memberData as any).role as 'owner' | 'co-organizer' | 'participant';
      }
      
      setMyRole(userRole);

      // Load members (only if organizer)
      if (userRole === 'owner' || userRole === 'co-organizer') {
        const { data: membersData } = await supabase
          .from('event_members')
          .select('*')
          .eq('event_id', eventId)
          .order('name');

        if (membersData && membersData.length > 0) {
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

          setMembers(membersWithProfiles);
        } else {
          setMembers([]);
        }
      }

      // Load media based on role
      if (userRole === 'participant') {
        // Participant: only see tagged media
        const { data: myMemberData } = await supabase
          .from('event_members')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();

        if (myMemberData) {
          const memberId = (myMemberData as any).id;
          const { data: tagsData } = await supabase
            .from('media_tags')
            .select('media_id')
            .eq('member_id', memberId);

          const mediaIds = (tagsData || []).map((t: any) => t.media_id);

          if (mediaIds.length > 0) {
            const { data: mediaData } = await supabase
              .from('media')
              .select('*')
              .in('id', mediaIds)
              .order('created_at', { ascending: false });

            setMedia(mediaData || []);
          }
        }
      } else {
        // Organizer: see all media
        const { data: mediaData } = await supabase
          .from('media')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        setMedia((mediaData as any) || []);

        // Count untagged
        if (mediaData) {
          let count = 0;
          for (const m of (mediaData as any[])) {
            const { count: tagCount } = await supabase
              .from('media_tags')
              .select('*', { count: 'exact', head: true })
              .eq('media_id', m.id);

            if (!tagCount || tagCount === 0) {
              count++;
            }
          }
          setUntaggedCount(count);
        }
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!event || !myRole) {
    return <div className="container mx-auto px-4 py-8">Événement non trouvé</div>;
  }

  const isOrganizer = myRole === 'owner' || myRole === 'co-organizer';

  // Filter and categorize participants
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(participantsSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(participantsSearch.toLowerCase())
  );

  const ownerCount = members.filter(m => m.role === 'owner').length;
  const coOrganizerCount = members.filter(m => m.role === 'co-organizer').length;
  const participantCount = members.filter(m => m.role === 'participant').length;

  // Show first 3 members in collapsed view
  const previewMembers = members.slice(0, 3);
  const hasMoreMembers = members.length > 3;

  // Participant management functions
  async function promoteMember(memberId: string) {
    setActionLoading(memberId);
    try {
      const { error } = await (supabase as any)
        .from('event_members')
        .update({ role: 'co-organizer' })
        .eq('id', memberId);

      if (error) throw error;
      await loadEvent();
    } catch (error) {
      console.error('Error promoting member:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function demoteMember(memberId: string) {
    setActionLoading(memberId);
    try {
      const { error } = await (supabase as any)
        .from('event_members')
        .update({ role: 'participant' })
        .eq('id', memberId);

      if (error) throw error;
      await loadEvent();
    } catch (error) {
      console.error('Error demoting member:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function removeMember(memberId: string) {
    setActionLoading(memberId);
    try {
      const { error } = await (supabase as any)
        .from('event_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await loadEvent();
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setActionLoading(null);
    }
  }

  const isOwner = currentUser?.id === event.owner_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative container mx-auto px-4 pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-12 max-w-[1600px]">
      {/* Event Health Card - Only for organizers */}
      {isOrganizer && (
        <div className="mb-6 space-y-4">
          <EventHealthCard 
            key={statsKey}
            eventId={eventId} 
          />
          
          {/* Reopen wizard button */}
          <button
            onClick={() => setWizardOpen(true)}
            className="w-full text-center py-2 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
          >
            🪄 Besoin d'aide ? Rouvrir le guide pas à pas
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Role badge */}
            <div className="mb-2">
              {myRole === 'owner' && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3" />
                  Organisateur
                </span>
              )}
              {myRole === 'co-organizer' && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <UserCog className="w-3 h-3" />
                  Co-organisateur
                </span>
              )}
              {myRole === 'participant' && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <Users className="w-3 h-3" />
                  Participant
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 break-words">{event.title}</h1>

            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm md:text-base text-muted-foreground">
              {event.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(event.date)}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {isOrganizer && (
              <>
                <Link href={`/upload?eventId=${eventId}`} className="flex-1 md:flex-initial">
                  <Button variant="outline" size="sm" className="w-full md:w-auto">
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Uploader</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </Link>
                <Link href={`/e/${eventId}/people`} className="flex-1 md:flex-initial">
                  <Button size="sm" className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" title="Identifier les personnes - IA + Manuel">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Identifier personnes</span>
                    <span className="sm:hidden">Personnes</span>
                  </Button>
                </Link>
                <Link href={`/e/${eventId}/edit`} className="flex-1 md:flex-initial">
                  <Button variant="outline" size="sm" className="w-full md:w-auto">
                    <Edit className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Éditer</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </Link>
              </>
            )}
            {!isOrganizer && (
              <>
                <Link href={`/upload?eventId=${eventId}`} className="flex-1 md:flex-initial">
                  <Button size="sm" className="w-full md:w-auto">
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Uploader mes photos</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </Link>
                <div className="flex-1 md:flex-initial">
                  <DownloadButton
                    eventId={eventId}
                    label="Télécharger"
                    variant="outline"
                    size="sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
        )}
      </div>

      {/* Warnings for organizers */}
      {isOrganizer && untaggedCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {untaggedCount} photo{untaggedCount > 1 ? 's' : ''} sans personne tagguée
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Utilisez le bouton "Identifier personnes" ci-dessus pour taguer les participants
            </p>
          </div>
        </div>
      )}

      {/* Organizer view */}
      {isOrganizer && (
        <>
          {/* Participants section - Enhanced UX */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg md:text-xl font-semibold">Participants ({members.length})</h2>
                {/* Role badges */}
                <div className="flex gap-2 text-xs">
                  {ownerCount > 0 && (
                    <Tooltip content="Propriétaire(s) de l'événement">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                        <Crown className="w-3 h-3" />
                        {ownerCount}
                      </span>
                    </Tooltip>
                  )}
                  {coOrganizerCount > 0 && (
                    <Tooltip content="Co-organisateur(s)">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                        <UserCog className="w-3 h-3" />
                        {coOrganizerCount}
                      </span>
                    </Tooltip>
                  )}
                  {participantCount > 0 && (
                    <Tooltip content="Participant(s)">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full">
                        <Users className="w-3 h-3" />
                        {participantCount}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" title="Inviter de nouvelles personnes à l'événement">
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Inviter des participants</span>
                  <span className="sm:hidden">Inviter</span>
                </Button>
              </div>
            </div>

            {/* Search bar (only show when expanded or searching) */}
            {(participantsExpanded || participantsSearch) && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un participant..."
                  value={participantsSearch}
                  onChange={(e) => setParticipantsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* Preview section (collapsed view) */}
            {!participantsExpanded && members.length > 0 && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="space-y-3">
                  {previewMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={(member as any).user?.avatar_url}
                          name={(member as any).user?.display_name || member.email || member.name}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">{(member as any).user?.display_name || member.email || member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'owner' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        member.role === 'co-organizer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        {member.role === 'owner' ? 'Propriétaire' : 
                         member.role === 'co-organizer' ? 'Co-organisateur' : 'Participant'}
                      </span>
                    </div>
                  ))}
                  
                  {hasMoreMembers && (
                    <div className="pt-2 border-t border-white/20">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setParticipantsExpanded(true)}
                        className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Voir tous les participants ({members.length - 3} de plus)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full members list (expanded view) */}
            {participantsExpanded && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    {participantsSearch ? `${filteredMembers.length} résultat(s)` : 'Tous les participants'}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setParticipantsExpanded(false)}
                    className="text-muted-foreground"
                  >
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Réduire
                  </Button>
                </div>
                
                {filteredMembers.length > 0 ? (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => {
                      const canRemove = isOwner && member.role !== 'owner';
                      const canPromote = isOwner && member.role === 'participant';
                      const canDemote = isOwner && member.role === 'co-organizer';
                      const isLoading = actionLoading === member.id;

                      return (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={(member as any).user?.avatar_url}
                              name={(member as any).user?.display_name || member.name}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              member.role === 'owner' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                              member.role === 'co-organizer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                            }`}>
                              {member.role === 'owner' ? 'Propriétaire' : 
                               member.role === 'co-organizer' ? 'Co-organisateur' : 'Participant'}
                            </span>
                            
                            {/* Actions menu - only show for owner */}
                            {isOwner && (canPromote || canDemote || canRemove) && (
                              <div className="relative group">
                                <button 
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </button>
                                
                                {/* Dropdown menu */}
                                <div className="absolute right-0 top-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                  {canPromote && (
                                    <button
                                      onClick={() => promoteMember(member.id)}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                      Promouvoir
                                    </button>
                                  )}
                                  {canDemote && (
                                    <button
                                      onClick={() => demoteMember(member.id)}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                      Rétrograder
                                    </button>
                                  )}
                                  {canRemove && (
                                    <>
                                      {(canPromote || canDemote) && <div className="border-t border-gray-200 dark:border-gray-700 my-1" />}
                                      <button
                                        onClick={() => removeMember(member.id)}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                                      >
                                        <UserMinus className="w-3 h-3" />
                                        Supprimer
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun participant trouvé</p>
                  </div>
                )}
              </div>
            )}

            {/* Show expand button if collapsed and no members shown */}
            {!participantsExpanded && members.length === 0 && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-xl p-8 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">Aucun participant pour le moment</p>
                <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Inviter des participants
                </Button>
              </div>
            )}
          </div>


          {/* Media section */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold mb-3">
              Photos ({media.length})
              {untaggedCount > 0 && (
                <span className="text-orange-600 text-sm ml-2">
                  ({untaggedCount} à taguer)
                </span>
              )}
            </h2>
            {media.length > 0 ? (
              <OptimizedMediaGrid 
                media={media} 
                onMediaDeleted={loadEvent}
                gridSize="medium"
                showDownloadButton={true}
              />
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground text-sm">Aucune photo pour le moment</p>
                <Link href={`/upload?eventId=${eventId}`}>
                  <Button size="sm" className="mt-3">
                    <Upload className="w-4 h-4 mr-2" />
                    Uploader
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Participant view */}
      {!isOrganizer && (
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3">Vos photos ({media.length})</h2>
          {media.length > 0 ? (
            <OptimizedMediaGrid media={media} onMediaDeleted={loadEvent} />
          ) : (
            <div className="relative overflow-hidden">
              {/* Glassmorphism card */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 text-center">
                
                {/* Animated loader */}
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse opacity-20" />
                  <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-white animate-bounce" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-black mb-2">
                  🎉 Vos photos arrivent bientôt !
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  L'organisateur est en train de préparer vos souvenirs. 
                  Vous serez notifié dès qu'ils seront prêts !
                </p>
                
                {/* Stats de l'événement */}
                {event && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
                      📸 Activité de l'événement
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                          {members.length}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">Participants</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                          {untaggedCount}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">En traitement</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Progress indicator */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-full text-sm mb-6">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    Identification en cours...
                  </span>
                </div>
                
                {/* Alternative actions */}
                <div className="pt-6 border-t border-white/20">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    💡 En attendant, vous pouvez :
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link href={`/upload?eventId=${eventId}`}>
                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Uploader vos photos
                      </Button>
                    </Link>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Inviter des amis
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <InviteMembersDialog
        eventId={eventId}
        isOpen={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onMemberAdded={loadEvent}
        currentMemberIds={members.map((m) => m.id)}
      />

      {/* Event Wizard */}
      {event && (
        <EventWizard
          eventId={eventId}
          eventTitle={event.title}
          isOpen={wizardOpen}
          onClose={() => {
            setWizardOpen(false);
            // Remove wizard param from URL
            router.replace(`/e/${eventId}`);
          }}
        />
      )}
      </div>
    </div>
  );
}