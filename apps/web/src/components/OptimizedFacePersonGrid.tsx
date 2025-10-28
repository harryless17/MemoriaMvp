'use client';

import { OptimizedFaceCard } from './OptimizedFaceCard';

interface OptimizedFacePersonGridProps {
  facePersons: any[];
  onAssign?: (person: any) => void;
  onInvite?: (person: any) => void;
  onMerge?: (person: any) => void;
  onIgnore?: (personId: string) => void;
  onViewDetails?: (person: any) => void;
  gridSize?: 'small' | 'medium' | 'large';
}

export default function OptimizedFacePersonGrid({
  facePersons,
  onAssign,
  onInvite,
  onMerge,
  onIgnore,
  onViewDetails,
  gridSize = 'medium'
}: OptimizedFacePersonGridProps) {
  
  // Configuration de la grille selon la taille
  const gridConfig = {
    small: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3',
    medium: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4',
    large: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
  };

  return (
    <div className={gridConfig[gridSize]}>
      {facePersons.map((person) => (
        <OptimizedFaceCard
          key={person.id}
          person={person}
          onAssign={onAssign}
          onInvite={onInvite}
          onMerge={onMerge}
          onIgnore={onIgnore}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
