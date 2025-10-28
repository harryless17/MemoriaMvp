'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/toast';

/**
 * Hook to listen for real-time notifications via Supabase Realtime
 * Shows toast notifications when new notifications are inserted
 */
export function useNotificationListener(userId: string | null) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up notification listener for user:', userId);

    // Subscribe to notifications channel
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          
          const notification = payload.new as any;

          // Show toast based on notification type
          if (notification.type === 'new_photos') {
            toast({
              type: 'success',
              title: notification.title,
              description: notification.message,
            });
            
            // Mark as read after delay
            setTimeout(() => markAsRead(notification.id), 3000);
            
            // Show browser notification
            showBrowserNotification(
              notification.title,
              notification.message
            );
          } else if (notification.type === 'event_complete') {
            toast({
              type: 'success',
              title: notification.title,
              description: notification.message,
            });
            
            setTimeout(() => markAsRead(notification.id), 3000);
            
            showBrowserNotification(
              notification.title,
              notification.message
            );
          } else {
            // Generic notification
            toast({
              type: 'info',
              title: notification.title,
              description: notification.message,
            });
          }

          // Play notification sound (optional)
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notification channel status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('🔔 Cleaning up notification listener');
      supabase.removeChannel(channel);
    };
  }, [userId, router, toast]);
}

/**
 * Mark a notification as read
 */
async function markAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  } catch (error) {
    console.error('Error in markAsRead:', error);
  }
}

/**
 * Play notification sound (optional, browser-dependent)
 */
function playNotificationSound() {
  try {
    // Only play if user has interacted with page (browser requirement)
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silent fail if audio blocked
      console.log('🔇 Notification sound blocked by browser');
    });
  } catch (error) {
    // Silent fail
  }
}

/**
 * Request notification permission (for browser notifications)
 */
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Show browser notification (in addition to toast)
 */
export function showBrowserNotification(title: string, body: string, icon?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    // Déterminer le logo selon le thème
    const isDark = document.documentElement.classList.contains('dark') || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    const logoSrc = isDark ? '/logo-dark.png' : '/logo-white.png';
    
    new Notification(title, {
      body,
      icon: icon || logoSrc,
      badge: logoSrc,
      tag: 'memoria-notification',
      requireInteraction: false,
    });
  }
}

