import { request } from './api.js';

// Rodada 21: storage usage + admin limits.

// Returns { storage: { usedBytes, quotaBytes, unlimited, percent, quotaSource, breakdown, orphanSweepHours } }
//   breakdown: { library, pending, published, orphan } -> { count, bytes }
export function getStorage() {
  return request('/api/storage');
}

// --- admin only ---------------------------------------------------------------

// Returns { users: [...], settings }
export function listAdminUsers() {
  return request('/api/admin/users');
}

// quotaMb: null = platform default, -1 = unlimited, number = MB. Returns { user }
export function setUserQuota(id, quotaMb) {
  return request(`/api/admin/users/${id}/quota`, { method: 'PATCH', body: JSON.stringify({ quotaMb }) });
}

// Returns { settings: { defaultQuotaMb, defaultFreeStorageDays, maxFreeStorageDays, orphanSweepHours, adminsUnlimited } }
export function getPlatformSettings() {
  return request('/api/admin/settings');
}

export function savePlatformSettings(body) {
  return request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
}