import { request } from './api.js';

// Rodada 13: Dashboard metrics.

// scope: 'all' | 'folder' | 'account'; id: folder/profile id; days: 7 | 30 | 90
// Returns { metrics: { label, range, totals, previous, series, ranking, folders, coverage, lastCollectedAt } }
export function getMetricsOverview({ scope = 'all', id = null, days = 30 } = {}) {
  const params = new URLSearchParams({ scope, days: String(days) });
  if (id) params.set('id', id);
  return request(`/api/metrics/overview?${params.toString()}`);
}

// Collects the profiles still missing today's data. Returns { refresh: { started, pending, retryInMinutes? } }
export function refreshMetrics() {
  return request('/api/metrics/refresh', { method: 'POST' });
}
