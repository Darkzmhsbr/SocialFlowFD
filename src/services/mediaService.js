import { request } from './api.js';

// Uploads a single File/Blob to /api/media/upload as multipart/form-data.
// The backend expects the field name "file" (see mediaRoutes.js on backend).
export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);

  return request('/api/media', {
    method: 'POST',
    body: formData,
  }).then((res) => res); // { success, data: { media } }
}

// Same as above but hits the more specific route.
// Rodada 7: opts.library = true keeps the upload in the Biblioteca
// (opts.folderId = target folder). Fields go BEFORE the file so the
// backend has them parsed when the file arrives.
export function uploadMediaFile(file, opts = {}) {
  const formData = new FormData();
  if (opts.library) formData.append('library', '1');
  if (opts.library && opts.folderId) formData.append('folderId', opts.folderId);
  formData.append('file', file);

  return request('/api/media/upload', {
    method: 'POST',
    body: formData,
  });
}

export function listMedia({ take = 50, skip = 0 } = {}) {
  const qs = new URLSearchParams({ take: String(take), skip: String(skip) }).toString();
  return request(`/api/media?${qs}`);
}

export function getMedia(id) {
  return request(`/api/media/${id}`);
}

export function deleteMedia(id) {
  return request(`/api/media/${id}`, { method: 'DELETE' });
}

// --- Rodada 7: media library --------------------------------------------

// Returns { folders: [{ id, name, count, preview }], counts: { all, root, unsaved } }
export function listFolders() {
  return request('/api/media/folders');
}

export function createFolder(name) {
  return request('/api/media/folders', { method: 'POST', body: JSON.stringify({ name }) });
}

export function renameFolder(id, name) {
  return request(`/api/media/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

// mode: 'keep' (media go to "Sem pasta") | 'delete' (media removed too)
export function deleteFolder(id, mode = 'keep') {
  return request(`/api/media/folders/${id}?mode=${mode}`, { method: 'DELETE' });
}

// scope: 'all' | 'root' | 'unsaved' | 'folder'. Returns { media, total, take, skip }
export function listLibrary({ scope = 'all', folderId, type, take = 60, skip = 0 } = {}) {
  const params = new URLSearchParams({ scope, take: String(take), skip: String(skip) });
  if (folderId) params.set('folderId', folderId);
  if (type) params.set('type', type);
  return request(`/api/media/library?${params.toString()}`);
}

// action: 'save' | 'move' | 'remove'. Returns { result }
export function libraryBulk(body) {
  return request('/api/media/library/bulk', { method: 'POST', body: JSON.stringify(body) });
}