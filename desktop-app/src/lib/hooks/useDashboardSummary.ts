import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import type { DashboardSummary } from '@/types';

export function useDashboardSummary(branchId?: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.getSummary(branchId);
      setSummary(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [branchId]);

  return {
    summary,
    loading,
    error,
    refreshSummary: fetchSummary,
  };
}
