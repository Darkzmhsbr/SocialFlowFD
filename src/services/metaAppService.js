import { request } from './api.js';

// Rodada 10: user's own Instagram app.

// Returns { credential, redirectUri, usingOwnApp, accounts: { viaOwnApp, viaDefaultApp, total } }
export function getMetaApp() {
  return request('/api/instagram/meta-app');
}

// Body: { appId, appSecret? } — appSecret optional when keeping the same appId.
export function saveMetaApp(body) {
  return request('/api/instagram/meta-app', { method: 'PUT', body: JSON.stringify(body) });
}

export function removeMetaApp() {
  return request('/api/instagram/meta-app', { method: 'DELETE' });
}