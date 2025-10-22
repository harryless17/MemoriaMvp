'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import FacePersonGrid from '@/components/FacePersonGrid';
import { ClusterCardWithSuggestion } from './ClusterCardWithSuggestion';
import AssignModalV2 from '@/components/AssignModalV2';
import InviteModal from '@/components/InviteModal';
import MergeModal from '@/components/MergeModal';
import ClusterDetailModal from '@/components/ClusterDetailModal';
import { AnalysisProgress } from '@/components/AnalysisProgress';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { RefreshCw, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Sparkles, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AITaggingViewProps {
  eventId: string;
  onStatsUpdate?: () => void;
}

export function AITaggingView({ eventId, onStatsUpdate }: AITaggingViewProps) {
  const [facePersons, setFacePersons] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [clusteringStatus, setClusteringStatus] = useState<string>('loading');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [modalType, setModalType] = useState<'assign' | 'invite' | 'merge' | 'detail' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIgnored, setShowIgnored] = useState(false);
  const [minPhotos, setMinPhotos] = useState(1);
  const [minQuality, setMinQuality] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false); // DÉSACTIVÉ TEMPORAIREMENT
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);

  useEffect(() => {
    loadFacePersons();
    loadMembers();
  }, [eventId]);

  async function loadMembers() {
    try {
      const { data: membersData } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

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
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }

  async function loadFacePersons() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/face-persons?event_id=${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch face persons');
      }

      const result = await response.json();
      setFacePersons(result.face_persons || []);
      setClusteringStatus(result.clustering_status);
    } catch (error) {
      console.error('Error loading face persons:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    try {
      setLoading(true);
      setShowAnalysisProgress(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ml-enqueue`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'cluster',
            event_id: eventId,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to start analysis');

      // Wait a bit then reload
      setTimeout(async () => {
        await loadFacePersons();
        onStatsUpdate?.();
      }, 3000);
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert('Erreur lors du lancement de l\'analyse');
    } finally {
      setLoading(false);
    }
  }

  function handleAnalysisComplete() {
    setShowAnalysisProgress(false);
    // Reload data to show new results
    loadFacePersons();
    loadMembers();
    onStatsUpdate?.();
  }


  const handleActionSuccess = async () => {
    await loadFacePersons();
    onStatsUpdate?.();
    closeModal();
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPerson(null);
  };

  function handleViewDetails(person: any) {
    setSelectedPerson(person);
    setModalType('detail');
  }

  // Filter clusters
  const filteredPersons = facePersons.filter((person) => {
    if (person.status === 'ignored' && !showIgnored) return false;
    if (person.status !== 'pending' && person.status !== 'ignored') return true;
    
    const quality = person.avg_quality || 0;
    const photos = person.face_count || 0;
    
    return photos >= minPhotos && quality >= minQuality;
  });

  // Categorize
  const linked = filteredPersons.filter((p) => p.status === 'linked');
  const invited = filteredPersons.filter((p) => p.status === 'invited');
  const ignored = filteredPersons.filter((p) => p.status === 'ignored');
  const pending = filteredPersons.filter((p) => p.status === 'pending');
  
  const reliable = pending.filter((p) => (p.face_count >= 3 || p.avg_quality >= 0.8));
  const toVerify = pending.filter((p) => (p.face_count < 3 && p.avg_quality < 0.8));

  if (loading && facePersons.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Controls */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col gap-4">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Min. photos:
              </label>
              <Select
                value={minPhotos.toString()}
                onChange={(e) => setMinPhotos(parseInt(e.target.value))}
                className="w-24"
              >
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
                <option value="10">10+</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Min. qualité:
              </label>
              <Select
                value={(minQuality * 100).toString()}
                onChange={(e) => setMinQuality(parseInt(e.target.value) / 100)}
                className="w-28"
              >
                <option value="0">Toutes</option>
                <option value="50">50%+</option>
                <option value="70">70%+</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
              </Select>
            </div>

            {(minPhotos > 1 || minQuality > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinPhotos(1);
                  setMinQuality(0);
                }}
              >
                Réinitialiser
              </Button>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {filteredPersons.filter(p => p.status === 'pending').length} / {pending.length} clusters affichés
              </span>

              {/* Suggestions toggle - TEMPORAIREMENT DÉSACTIVÉ */}
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                disabled={true}
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all opacity-50 cursor-not-allowed',
                  'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                )}
              >
                <Sparkles className="w-3 h-3" />
                Suggestions OFF (temporaire)
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {ignored.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIgnored(!showIgnored)}
              >
                {showIgnored ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showIgnored ? 'Masquer' : 'Afficher'} ignorés ({ignored.length})
              </Button>
            )}
            
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Analyse...' : 'Analyser les photos'}
            </Button>
          </div>
        </div>
      </div>

      {/* Identified */}
      {linked.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Identifiées ({linked.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Personnes déjà associées à des participants
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <FacePersonGrid
              facePersons={linked}
              onAssign={(person) => {
                setSelectedPerson(person);
                setModalType('assign');
              }}
              onMerge={(person) => {
                setSelectedPerson(person);
                setModalType('merge');
              }}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>
      )}

      {/* Reliable */}
      {reliable.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                🎯 Fiables ({reliable.length})
              </h2>
              {showSuggestions && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Suggestions actives
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Clusters avec plusieurs photos ou haute qualité
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {reliable.map((person) => (
              <ClusterCardWithSuggestion
                key={person.id}
                cluster={person}
                members={members}
                allClusters={facePersons}
                showSuggestions={showSuggestions}
                onAssign={(p) => {
                  setSelectedPerson(p);
                  setModalType('assign');
                }}
                onInvite={(p) => {
                  setSelectedPerson(p);
                  setModalType('invite');
                }}
                onMerge={(p) => {
                  setSelectedPerson(p);
                  setModalType('merge');
                }}
                onViewDetails={handleViewDetails}
                onActionSuccess={handleActionSuccess}
              />
            ))}
          </div>
        </div>
      )}

      {/* To Verify */}
      {toVerify.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold">
                À vérifier ({toVerify.length})
              </h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Clusters avec peu de photos ou qualité basse
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {toVerify.map((person) => (
              <ClusterCardWithSuggestion
                key={person.id}
                cluster={person}
                members={members}
                allClusters={facePersons}
                showSuggestions={showSuggestions}
                onAssign={(p) => {
                  setSelectedPerson(p);
                  setModalType('assign');
                }}
                onInvite={(p) => {
                  setSelectedPerson(p);
                  setModalType('invite');
                }}
                onMerge={(p) => {
                  setSelectedPerson(p);
                  setModalType('merge');
                }}
                onViewDetails={handleViewDetails}
                onActionSuccess={handleActionSuccess}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ignored */}
      {showIgnored && ignored.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🚫 Ignorés ({ignored.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Clusters masqués de l'analyse
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <FacePersonGrid
              facePersons={ignored}
              onMerge={(person) => {
                setSelectedPerson(person);
                setModalType('merge');
              }}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {facePersons.length === 0 && !loading && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center">
          <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun visage détecté</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Lancez l'analyse pour détecter automatiquement les personnes sur vos photos
          </p>
          <Button
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Brain className="w-5 h-5 mr-2" />
            Analyser les photos
          </Button>
        </div>
      )}

      {/* Analysis Progress Modal */}
      {showAnalysisProgress && (
        <AnalysisProgress
          isAnalyzing={showAnalysisProgress}
          eventId={eventId}
          onComplete={handleAnalysisComplete}
          onError={(error) => {
            console.error('Analysis error:', error);
            setShowAnalysisProgress(false);
            alert('Erreur lors de l\'analyse. Veuillez réessayer.');
          }}
        />
      )}

      {/* Modals */}
      {modalType === 'assign' && selectedPerson && (
        <AssignModalV2
          facePerson={selectedPerson}
          eventId={eventId}
          onClose={closeModal}
          onAssigned={handleActionSuccess}
        />
      )}

      {modalType === 'invite' && selectedPerson && (
        <InviteModal
          facePerson={selectedPerson}
          eventId={eventId}
          onClose={closeModal}
          onInvited={handleActionSuccess}
        />
      )}

      {modalType === 'merge' && selectedPerson && (
        <MergeModal
          facePerson={selectedPerson}
          allFacePersons={facePersons}
          eventId={eventId}
          onClose={closeModal}
          onSuccess={handleActionSuccess}
        />
      )}

      {modalType === 'detail' && selectedPerson && (
        <ClusterDetailModal
          facePerson={selectedPerson}
          eventId={eventId}
          onClose={closeModal}
          onFaceRemoved={handleActionSuccess}
        />
      )}
    </div>
  );
}

