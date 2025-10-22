'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Media, EventMember } from '@memoria/ui';
import { MediaSelector } from '@/components/MediaSelector';
import { MemberSelector } from '@/components/MemberSelector';
import { Button } from '@/components/ui/button';
import { Tag, Loader2, CheckCircle, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualTaggingViewProps {
  eventId: string;
  onStatsUpdate?: () => void;
}

export function ManualTaggingView({ eventId, onStatsUpdate }: ManualTaggingViewProps) {
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'untagged' | 'tagged'>('untagged'); // Default to untagged
  const [mediaCounts, setMediaCounts] = useState({ total: 0, tagged: 0, untagged: 0 });

  useEffect(() => {
    loadData();
  }, [eventId, filter]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Check user role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: memberData } = await supabase
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      const userRole = (memberData as any)?.role;
      if (!memberData || !['owner', 'co-organizer'].includes(userRole)) {
        setError("Vous n'avez pas les permissions pour taguer dans cet événement");
        return;
      }

      // Load media with tag counts
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select(`
          *,
          media_tags(count)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      // Transform data
      const mediaWithCounts = (mediaData || []).map((m: any) => ({
        ...m,
        tag_count: m.media_tags?.[0]?.count || 0
      }));

      // Calculate counts BEFORE filtering
      const totalCount = mediaWithCounts.length;
      const taggedCount = mediaWithCounts.filter(m => m.tag_count > 0).length;
      const untaggedCount = mediaWithCounts.filter(m => m.tag_count === 0).length;

      setMediaCounts({ total: totalCount, tagged: taggedCount, untagged: untaggedCount });

      // Filter based on selection
      let filteredMedia = mediaWithCounts;
      if (filter === 'untagged') {
        filteredMedia = mediaWithCounts.filter(m => m.tag_count === 0);
      } else if (filter === 'tagged') {
        filteredMedia = mediaWithCounts.filter(m => m.tag_count > 0);
      }

      setMedia(filteredMedia);

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (membersError) throw membersError;

      // Get profiles
      const userIds = [...new Set((membersData || []).map((m: any) => m.user_id).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      // Calculate media_count for each member
      const membersWithCounts = await Promise.all(
        (membersData || []).map(async (m: any) => {
          const { count } = await supabase
            .from('media_tags')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', m.id);

          return {
            ...m,
            media_count: count || 0,
            user: profilesData?.find((p: any) => p.id === m.user_id) || null
          };
        })
      );

      setMembers(membersWithCounts);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  async function handleTag() {
    if (selectedMediaIds.size === 0 || selectedMemberIds.size === 0) {
      return;
    }

    try {
      setTagging(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the bulk tag function
      const { data, error } = await (supabase as any).rpc('tag_media_bulk', {
        p_media_ids: Array.from(selectedMediaIds),
        p_member_ids: Array.from(selectedMemberIds),
        p_tagged_by: user.id,
      });

      if (error) throw error;

      // Clear selections
      setSelectedMediaIds(new Set());
      setSelectedMemberIds(new Set());

      // Reload data
      await loadData();
      onStatsUpdate?.();

      // Success feedback
      alert(`✅ ${selectedMediaIds.size} × ${selectedMemberIds.size} = ${selectedMediaIds.size * selectedMemberIds.size} tags créés !`);
    } catch (err: any) {
      console.error('Error tagging:', err);
      setError(err.message || 'Erreur lors du tagging');
    } finally {
      setTagging(false);
    }
  }

  const totalTags = selectedMediaIds.size * selectedMemberIds.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !media.length) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Filters */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Filtrer :
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                filter === 'all'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white/80'
              )}
            >
              Toutes ({mediaCounts.total})
            </button>
            
            <button
              onClick={() => setFilter('untagged')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                filter === 'untagged'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white/80'
              )}
            >
              Non taguées ({mediaCounts.untagged})
            </button>
            
            <button
              onClick={() => setFilter('tagged')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                filter === 'tagged'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white/80'
              )}
            >
              Taguées ({mediaCounts.tagged})
            </button>
          </div>

          {(selectedMediaIds.size > 0 || selectedMemberIds.size > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedMediaIds(new Set());
                setSelectedMemberIds(new Set());
              }}
              className="ml-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Tout désélectionner
            </Button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Photos - Takes 3 columns */}
        <div className="lg:col-span-3">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">
              Photos de l'événement ({media.length})
            </h3>
            {media.length > 0 ? (
              <MediaSelector
                media={media}
                selectedIds={selectedMediaIds}
                onSelectionChange={setSelectedMediaIds}
                showTagCount={true}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">
                  {filter === 'untagged' 
                    ? '✅ Toutes les photos sont déjà taguées !'
                    : 'Aucune photo à afficher'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Members - Sticky sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-4">
            
            {/* Members list */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">
                Participants ({members.length})
              </h3>
              <MemberSelector
                members={members}
                selectedIds={selectedMemberIds}
                onSelectionChange={setSelectedMemberIds}
              />
            </div>

            {/* Action button */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                  {totalTags}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedMediaIds.size} photo{selectedMediaIds.size > 1 ? 's' : ''} × {selectedMemberIds.size} personne{selectedMemberIds.size > 1 ? 's' : ''}
                </p>
              </div>

              <Button
                onClick={handleTag}
                disabled={totalTags === 0 || tagging}
                className={cn(
                  'w-full gap-2',
                  totalTags > 0 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                    : ''
                )}
              >
                {tagging ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Tagging...
                  </>
                ) : (
                  <>
                    <Tag className="w-5 h-5" strokeWidth={2.5} />
                    {totalTags > 0 ? `Créer ${totalTags} tags` : 'Sélectionnez photos et personnes'}
                  </>
                )}
              </Button>

              {selectedMediaIds.size > 0 && selectedMemberIds.size > 0 && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-3">
                  💡 Les participants recevront une notification
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Success/Error messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

