import Link from 'next/link';
import type { Event } from '@memoria/ui';
import { formatDate } from '@memoria/ui';
import { Calendar, MapPin, Lock } from 'lucide-react';
import { Avatar } from './ui/avatar';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/e/${event.id}`}>
      <div className="glass-card p-6 cursor-pointer h-full group">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">{event.title}</h3>
          {/* All events are private in the new model */}
          <span className="text-muted-foreground flex-shrink-0 ml-2">
            <Lock className="w-5 h-5" />
          </span>
        </div>

        {event.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{event.description}</p>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          {event.date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.date)}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>

        {event.owner && (
          <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar
                src={event.owner.avatar_url}
                name={event.owner.display_name || event.owner.email || 'Anonyme'}
                size="sm"
              />
              <span>Organisé par {event.owner.display_name || event.owner.email || 'Anonyme'}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
