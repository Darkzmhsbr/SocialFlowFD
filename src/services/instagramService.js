import { apiUrl, request } from './api.js';

// Fetches the authorize URL from the backend (requires auth so the
// backend knows which user is starting the flow). The frontend then does
// window.location.href = url to send the browser to Meta.
export async function getAuthorizeUrl() {
  const { url } = await request('/api/instagram/authorize-url');
  return url;
}

// Kept for backwards compatibility with code that may still import it,
// though ConnectInstagramButton no longer uses this direct-link approach.
// It just returns the URL string of the (now removed) /connect endpoint.
export function getConnectUrl() {
  return apiUrl('/api/instagram/connect');
}

export function listAccounts() {
  return request('/api/instagram/accounts');
}

export function disconnectAccount(id) {
  return request(`/api/instagram/accounts/${id}`, { method: 'DELETE' });
}