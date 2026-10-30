import { request } from './api.js';

// Rodada 8: profile folders.

// Returns { folders: [{ id, name, accountIds, count }] }
export function listAccountFolders() {
  return request('/api/instagram/folders');
}

export function createAccountFolder(name, accountIds = []) {
  return request('/api/instagram/folders', { method: 'POST', body: JSON.stringify({ name, accountIds }) });
}

export function renameAccountFolder(id, name) {
  return request(`/api/instagram/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function deleteAccountFolder(id) {
  return request(`/api/instagram/folders/${id}`, { method: 'DELETE' });
}

// Replaces the whole member list.
export function setAccountFolderMembers(id, accountIds) {
  return request(`/api/instagram/folders/${id}/members`, { method: 'PUT', body: JSON.stringify({ accountIds }) });
}