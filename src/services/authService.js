import { request } from './api.js';

// POST /api/auth/register
// { email, password, name?, inviteCode }  -> { user, token }
export function register({ email, password, name, inviteCode }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, inviteCode }),
  });
}

// POST /api/auth/login
// { email, password }  -> { user, token }
export function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// GET /api/auth/me  (Authorization: Bearer set by api.js)  -> { user }
export function me() {
  return request('/api/auth/me');
}

// POST /api/auth/logout
// Server-side is a no-op in the JWT MVP, but we call it so a future
// token-blacklist implementation lands transparently.
export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}