import { AlertTriangle, Bell, Clock3, DollarSign, Info, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { NotificationItem } from '@/types';

function notificationIcon(notification: NotificationItem) {
  if (notification.severity === 'critical') {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (notification.type === 'payment_received') {
    return <DollarSign className="h-4 w-4" />;
  }
  if ((notification.type as string).startsWith('attendance')) {
    return <Clock3 className="h-4 w-4" />;
  }
  return <Info className="h-4 w-4" />;
}

function severityStyles(notification: NotificationItem) {
  if (notification.severity === 'critical') {
    return 'bg-red-100 text-red-700';
  }
  if (notification.severity === 'warning') {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-blue-100 text-blue-700';
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface NotificationDropdownProps {
  /** Called when the dropdown should close. */
  onClose: () => void;
  /** Whether to show branch names (e.g., for superadmin view). */
  showBranchName?: boolean;
}

/**
 * NotificationDropdown — the dropdown panel with notification list.
 * Uses useNotifications internally for state and actions.
 * Must be rendered as a sibling to the bell button (not inside it).
 */
export function NotificationDropdown({ onClose, showBranchName = false }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } =
    useNotifications();

  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification);
    if (notification.action_route) {
      navigate(notification.action_route);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 z-50 mt-3 w-96 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          <p className="text-xs text-gray-500">Payment updates for your access scope</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-200"
            >
              Mark all read
            </button>
          )}
          {!loading && unreadCount > 0 && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
          Loading notifications...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-500">
          <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          No payment notifications yet.
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={`w-full rounded-2xl border p-3 text-left transition-colors hover:border-gray-200 hover:bg-white ${
                notification.is_read
                  ? 'border-gray-100 bg-white'
                  : 'border-purple-100 bg-purple-50/40'
              }`}
            >
              <div className="mb-2 flex items-start gap-3">
                <div className={`rounded-xl p-2 ${severityStyles(notification)}`}>
                  {notificationIcon(notification)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityStyles(notification)}`}
                      >
                        {notification.severity}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {notification.description}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatTime(notification.created_at)}
                  </p>
                  {showBranchName && notification.branch_name && (
                    <p className="mt-2 text-xs font-medium text-gray-500">
                      {notification.branch_name}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
