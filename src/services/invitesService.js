import { request } from './api.js';

// Rodada 11: admin-only invites.

// Returns { isAdmin }
export function getAdminMe() {
  return request('/api/admin/me');
}

// Returns { invites: [{ id, code, note, createdAt, expiresAt, usedAt, usedBy, status, createdBy }] }
export function listAllInvites() {
  return request('/api/invites/all');
}

// Body: { note?, expiresInDays? }. Returns { invite }
export function createInvite(body) {
  return request('/api/invites', { method: 'POST', body: JSON.stringify(body) });
}

export function revokeInvite(id) {
  return request(`/api/invites/${id}`, { method: 'DELETE' });
}