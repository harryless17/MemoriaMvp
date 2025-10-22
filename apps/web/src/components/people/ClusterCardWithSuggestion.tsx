'use client';

import { useSuggestMemberForCluster } from '@/hooks/useSuggestMemberForCluster';
import { ClusterSuggestion } from '@/components/ClusterSuggestion';
import FacePersonGrid from '@/components/FacePersonGrid';

interface ClusterCardWithSuggestionProps {
  cluster: any;
  members: any[];
  allClusters: any[];
  showSuggestions: boolean;
  onAssign: (cluster: any) => void;
  onInvite: (cluster: any) => void;
  onMerge: (cluster: any) => void;
  onViewDetails: (cluster: any) => void;
  onActionSuccess: () => void;
  hideAssignButton?: boolean;
  hideInviteButton?: boolean;
  hideIgnoreButton?: boolean;
}

export function ClusterCardWithSuggestion({
  cluster,
  members,
  allClusters,
  showSuggestions,
  onAssign,
  onInvite,
  onMerge,
  onViewDetails,
  onActionSuccess,
  hideAssignButton,
  hideInviteButton,
  hideIgnoreButton,
}: ClusterCardWithSuggestionProps) {
  
  // Get AI suggestion for this cluster
  const { suggestion } = useSuggestMemberForCluster(cluster, members, allClusters);

  return (
    <div className="relative">
      {/* Regular cluster card */}
      <FacePersonGrid
        facePersons={[cluster]}
        onAssign={onAssign}
        onInvite={onInvite}
        onMerge={onMerge}
        onViewDetails={onViewDetails}
      />

      {/* AI Suggestion overlay - TEMPORAIREMENT DÉSACTIVÉ */}
      {false && showSuggestions && suggestion && cluster.status === 'pending' && (
        <div className="mt-2">
          <ClusterSuggestion
            cluster={cluster}
            suggestion={suggestion}
            onAccept={onActionSuccess}
            onReject={() => {
              // Just hide, don't do anything else
            }}
          />
        </div>
      )}
    </div>
  );
}

