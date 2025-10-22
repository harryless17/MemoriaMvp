'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bell, 
  X, 
  Eye, 
  EyeOff, 
  Users, 
  Image, 
  Mail,
  ChevronRight,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'tagged_in_media' | 'added_to_event' | 'invitation_sent' | 'new_photos';
  is_read: boolean;
  created_at: string;
  event_id?: string;
  actor_id?: string;
  actor?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  event?: {
    id: string;
    title: string;
  };
}

export function NotificationDropdown({ isOpen, onClose, onNotificationRead }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  async function loadNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          event:events(id, title),
          media:media(id, type, storage_path)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Load actor profiles separately
      if (data && data.length > 0) {
        const actorIds = data
          .map((n: any) => n.actor_id)
          .filter((id: any) => id != null);
        
        if (actorIds.length > 0) {
          const { data: actors } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', actorIds);
          
          // Attach actors to notifications
          data.forEach((notif: any) => {
            if (notif.actor_id) {
              notif.actor = actors?.find((a: any) => a.id === notif.actor_id);
            }
          });
        }
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    setMarkingAsRead(notificationId);
    try {
      const { error } = await (supabase as any).rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      // Notify parent to refresh unread count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingAsRead(null);
    }
  }

  async function markAllAsRead() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any).rpc('mark_all_notifications_read', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Notify parent to refresh unread count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'tagged_in_media':
        return <Image className="w-4 h-4" />;
      case 'added_to_event':
        return <Users className="w-4 h-4" />;
      case 'invitation_sent':
        return <Mail className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  }

  function getNotificationColor(type: Notification['type']) {
    switch (type) {
      case 'tagged_in_media':
        return 'text-blue-600';
      case 'added_to_event':
        return 'text-green-600';
      case 'invitation_sent':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Dropdown */}
      <div 
        className="absolute top-16 right-4 w-80 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl max-h-[500px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Tout marquer
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-accent/50 transition-colors cursor-pointer',
                    !notification.is_read && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-1 p-2 rounded-lg bg-muted/50',
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          'font-medium text-sm',
                          !notification.is_read && 'font-semibold'
                        )}>
                          {notification.title}
                        </h4>
                        
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            disabled={markingAsRead === notification.id}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            {markingAsRead === notification.id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr
                          })}
                        </span>
                        
                        {notification.event && (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <span>{notification.event.title}</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
