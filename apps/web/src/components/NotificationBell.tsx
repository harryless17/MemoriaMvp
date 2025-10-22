'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Get user ID
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    getUser();
  }, []);

  // Use hook with auto-refresh every 10s + manual refetch
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useUnreadNotifications(userId || '');

  function handleBellClick() {
    setIsOpen(!isOpen);
    // Refresh count when opening dropdown
    if (!isOpen && refetchUnreadCount) {
      refetchUnreadCount();
    }
  }

  function handleClose() {
    setIsOpen(false);
    // Refresh count when closing dropdown (in case notifications were marked as read)
    if (refetchUnreadCount) {
      refetchUnreadCount();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={handleBellClick}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <NotificationDropdown 
        isOpen={isOpen} 
        onClose={handleClose}
        onNotificationRead={refetchUnreadCount}
      />
    </>
  );
}