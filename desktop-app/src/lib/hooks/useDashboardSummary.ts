import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import type { DashboardSummary } from '@/types';

export function useDashboardSummary(branchId?: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await dashboardApi.getSummary(branchId);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchSummary();

    const intervalId = window.setInterval(() => {
      void fetchSummary(true);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [branchId]);

  return {
    summary,
    loading,
    error,
    refreshSummary: () => fetchSummary(),
  };
}
