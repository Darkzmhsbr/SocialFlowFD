import { request } from './api.js';

// Rodada 12: background cleanup + reports + automatic rules.

// Body: { action, filter }. Returns { preview: { matched, overLimit, inFlightSkipped, estimatedFiles, estimatedBytes } }
export function previewCleanup(body) {
  return request('/api/cleanup/preview', { method: 'POST', body: JSON.stringify(body) });
}

// Returns { job }
export function startCleanup(body) {
  return request('/api/cleanup/jobs', { method: 'POST', body: JSON.stringify(body) });
}

// scope: 'active' | 'done' | 'all'. Returns { jobs }
export function listCleanupJobs(scope = 'all', take = 50) {
  return request(`/api/cleanup/jobs?scope=${scope}&take=${take}`);
}

export function cancelCleanup(id) {
  return request(`/api/cleanup/jobs/${id}/cancel`, { method: 'POST' });
}

// Returns { settings: { freeStorageAfterDays, archiveFailedAfterDays, lastAutoRunAt } }
export function getCleanupSettings() {
  return request('/api/cleanup/settings');
}

export function saveCleanupSettings(body) {
  return request('/api/cleanup/settings', { method: 'PUT', body: JSON.stringify(body) });
}
