'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { OptimizedImage } from './OptimizedImage';
import { getUserDisplayName } from '@/lib/userHelpers';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Image as ImageIcon, 
  Crown, 
  UserCog, 
  Sparkles, 
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    date?: string;
    location?: string;
    created_at: string;
    my_role: 'owner' | 'co-organizer' | 'participant';
    member_count?: number;
    media_count?: number;
    my_media_count?: number;
    untagged_count?: number;
    firstMediaPath?: string;
    owner?: {
      id: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  onEventClick?: (eventId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export const OptimizedEventCard = memo(function EventCard({ event, onEventClick }: EventCardProps) {
  const handleClick = () => {
    onEventClick?.(event.id);
  };

  return (
    <div 
      className="group glass-card overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300"
      onClick={handleClick}
    >
      {/* Event Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
        {event.firstMediaPath ? (
          <OptimizedImage
            src={event.firstMediaPath}
            alt={event.title}
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            size="medium"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Calendar className="w-16 h-16 text-white/50" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Role Badge */}
        <div className="absolute top-3 left-3">
          {event.my_role === 'owner' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              <Crown className="w-3 h-3" />
              Organisateur
            </div>
          )}
          {event.my_role === 'co-organizer' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              <UserCog className="w-3 h-3" />
              Co-organisateur
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 flex gap-2">
          {event.media_count && event.media_count > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              <ImageIcon className="w-3 h-3" />
              {event.media_count}
            </div>
          )}
          {event.member_count && event.member_count > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              <Users className="w-3 h-3" />
              {event.member_count}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="space-y-2 mb-4">
          {event.date && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.date)}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>

        {/* Owner Info */}
        {event.owner && (
          <div className="flex items-center gap-2 mb-4">
            <Avatar 
              src={event.owner.avatar_url}
              name={getUserDisplayName({ display_name: event.owner.display_name, email: '' })}
              size="sm"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Par {getUserDisplayName({ display_name: event.owner.display_name, email: '' })}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/e/${event.id}`} className="flex-1">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Voir l'événement
            </Button>
          </Link>
          
          {event.my_role === 'owner' && event.untagged_count && event.untagged_count > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              {event.untagged_count} à tagger
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
