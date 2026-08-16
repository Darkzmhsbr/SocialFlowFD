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
export function uploadMediaFile(file) {
  const formData = new FormData();
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