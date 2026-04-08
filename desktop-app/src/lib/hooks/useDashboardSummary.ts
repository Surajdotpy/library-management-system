import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { dashboardApi } from '@/lib/api/dashboard';
import { getStoredToken } from '@/lib/auth/session';
import type { DashboardSummary } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useDashboardSummary(branchId?: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);

  const fetchSummary = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await dashboardApi.getSummary(branchId);
      setSummary(data);
      setError(null);
    } catch (err: unknown) {
      if (!silent) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Failed to load dashboard';
        setError(message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [branchId]);

  useEffect(() => {
    refreshRef.current = fetchSummary;
  }, [fetchSummary]);

  useEffect(() => {
    void fetchSummary();

    const intervalId = window.setInterval(() => {
      void refreshRef.current?.(true);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchSummary]);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      return undefined;
    }

    const socket: Socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const refreshDashboard = () => {
      void refreshRef.current?.(true);
    };

    socket.on('payment_activity', refreshDashboard);
    socket.on('payment_received', refreshDashboard);

    return () => {
      socket.off('payment_activity', refreshDashboard);
      socket.off('payment_received', refreshDashboard);
      socket.disconnect();
    };
  }, []);

  return {
    summary,
    loading,
    error,
    refreshSummary: () => fetchSummary(),
  };
}
