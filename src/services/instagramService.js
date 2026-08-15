import { request, apiUrl } from './api.js';

// Connecting means leaving the SPA entirely - the browser is sent to the
// backend's /connect route, which redirects again to Meta's own login page.
// There is no token handling here; the frontend never sees one.
export function getConnectUrl() {
  return apiUrl('/api/instagram/connect');
}

export function listAccounts() {
  return request('/api/instagram/accounts');
}

export function getAccount(id) {
  return request(`/api/instagram/accounts/${id}`);
}

export function disconnectAccount(id) {
  return request(`/api/instagram/accounts/${id}`, { method: 'DELETE' });
}
