'use client';

import { useState } from 'react';
import type { EventMember } from '@memoria/ui';
import { getInitials } from '@memoria/ui';
import { Avatar } from './ui/avatar';
import { Check, Search, UserCheck, Clock, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { getUserDisplayName } from '@/lib/userHelpers';

interface MemberSelectorProps {
  members: EventMember[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  showStatus?: boolean;
}

export function MemberSelector({ 
  members, 
  selectedIds, 
  onSelectionChange,
  showStatus = true 
}: MemberSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelection = (memberId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(new Set(filteredMembers.map(m => m.id)));
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    const displayName = getUserDisplayName({ display_name: member.user?.display_name, email: member.email });
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getMemberStatus = (member: EventMember) => {
    if (member.user_id && member.joined_at) {
      return { icon: UserCheck, label: 'Inscrit', color: 'text-green-600' };
    }
    if (member.invitation_sent_at && !member.joined_at) {
      return { icon: Clock, label: 'Invitation envoyée', color: 'text-orange-600' };
    }
    return { icon: UserX, label: 'Non invité', color: 'text-gray-600' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? (
              <span className="font-semibold text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? 'personne sélectionnée' : 'personnes sélectionnées'}
              </span>
            ) : (
              <span>Sélectionnez des personnes</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-primary hover:underline"
              type="button"
            >
              Tout sélectionner
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={deselectAll}
                className="text-sm text-muted-foreground hover:underline"
                type="button"
              >
                Tout désélectionner
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length > 0 ? (
        <div className="space-y-2 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2">
          {filteredMembers.map((member) => {
            const isSelected = selectedIds.has(member.id);
            const status = getMemberStatus(member);
            const StatusIcon = status.icon;

            return (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
                onClick={() => toggleSelection(member.id)}
              >
                {/* Avatar */}
                <Avatar 
                  src={member.user?.avatar_url}
                  name={getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}
                  size="md"
                  className={cn(
                    "rounded-full flex-shrink-0",
                    isSelected ? "ring-2 ring-primary" : ""
                  )}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{getUserDisplayName({ display_name: member.user?.display_name, email: member.email })}</div>
                  <div className="text-sm text-muted-foreground truncate">{member.email}</div>
                  {showStatus && (
                    <div className={cn("flex items-center gap-1 text-xs mt-1", status.color)}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.label}</span>
                    </div>
                  )}
                  {member.media_count !== undefined && member.media_count > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      {member.media_count} {member.media_count === 1 ? 'photo' : 'photos'}
                    </div>
                  )}
                </div>

                {/* Checkbox */}
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? (
            <p>Aucune personne trouvée pour "{searchQuery}"</p>
          ) : (
            <p>Aucune personne dans cet événement</p>
          )}
        </div>
      )}
    </div>
  );
}
