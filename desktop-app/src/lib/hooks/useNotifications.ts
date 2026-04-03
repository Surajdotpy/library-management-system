import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { notificationsApi } from '@/lib/api/notifications';
import type { NotificationItem } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const POLL_INTERVAL_MS = 15_000;

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** Refetch notifications from the API (silent = no loading spinner) */
  refresh: (silent?: boolean) => Promise<void>;
  /** Mark a single notification as read (optimistic UI + API call) */
  markAsRead: (notification: NotificationItem) => void;
  /** Mark all notifications as read (optimistic UI + API call) */
  markAllAsRead: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the latest refresh so socket handler never goes stale
  const refreshRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);

  // ─── Core fetch ────────────────────────────────────────────────────────────
  const refresh = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await notificationsApi.getAll();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
      setError(null);
    } catch (err: unknown) {
      if (!silent) {
        const message =
          (err as any)?.response?.data?.error ||
          (err as Error)?.message ||
          'Failed to load notifications';
        setError(message);
        setNotifications([]);
        setUnreadCount(0);
      }
      // Silent failures are swallowed — polling / socket should retry
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Keep ref in sync so the socket effect can call the latest version
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // ─── Initial load + polling fallback ───────────────────────────────────────
  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refreshRef.current?.(true);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  // ─── Socket.io — real-time updates ─────────────────────────────────────────
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      // Reconnect automatically with exponential back-off
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔔 Notifications socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔔 Notifications socket disconnected:', reason);
    });

    socket.on('payment_received', () => {
      // Do NOT manually create a fake notification or increment the counter.
      // Always refetch from the API — it is the single source of truth.
      void refreshRef.current?.(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps — socket is created once per hook mount

  // ─── Mark single notification as read ──────────────────────────────────────
  const markAsRead = useCallback((notification: NotificationItem) => {
    if (notification.is_read) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Fire-and-forget API call; on failure we silently accept the stale state
    // (next poll will reconcile)
    notificationsApi.markAsRead(notification.id).catch((err) => {
      console.error('Failed to mark notification as read:', err);
    });
  }, []);

  // ─── Mark ALL notifications as read ────────────────────────────────────────
  const markAllAsRead = useCallback(() => {
    // Optimistic UI update
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.is_read ? n : { ...n, is_read: true, read_at: now },
      ),
    );
    setUnreadCount(0);

    // Fire-and-forget API call
    notificationsApi.markAllAsRead().catch((err) => {
      console.error('Failed to mark all notifications as read:', err);
    });
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
