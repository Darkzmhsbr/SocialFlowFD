import { request } from './api.js';

// GET /api/posts?status=DRAFT
export function listPosts({ status, take = 50, skip = 0 } = {}) {
  const params = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (status) params.set('status', status);
  return request(`/api/posts?${params.toString()}`);
}

export function getPost(id) {
  return request(`/api/posts/${id}`);
}

// Body: { instagramAccountId, type, caption?, mediaIds, scheduledFor? }
export function createPost(body) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Body: any subset of { caption, type, mediaIds, scheduledFor }
export function updatePost(id, patch) {
  return request(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function archivePost(id) {
  return request(`/api/posts/${id}/archive`, { method: 'POST' });
}

export function deletePost(id) {
  return request(`/api/posts/${id}`, { method: 'DELETE' });
}