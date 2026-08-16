import { useCallback, useEffect, useState } from 'react';
import * as dashboardService from '../services/dashboardService.js';

export function useDashboardStats() {
  const [status, setStatus] = useState('loading');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Backend returns { success, counts, activity, upcomingPosts } at root.
      const { counts, activity, upcomingPosts } = await dashboardService.getStats();
      setStats({ counts, activity, upcomingPosts });
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, stats, error, reload: load };
}