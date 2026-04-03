import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface NotificationBellProps {
  /** Whether the bell dropdown is currently open — used to highlight the bell */
  isOpen: boolean;
}

/**
 * NotificationBell — the bell icon button with unread badge.
 * Uses useNotifications internally to display the unread count badge.
 * The parent (Header) owns the open/close state.
 */
export function NotificationBell({ isOpen: _isOpen }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <span className="relative inline-flex">
      <Bell className="h-5 w-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </span>
  );
}
