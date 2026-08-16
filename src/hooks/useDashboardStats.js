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
      const { data } = await dashboardService.getStats();
      setStats(data);
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