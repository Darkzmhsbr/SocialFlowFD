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

// Body: { instagramAccountId, type, caption?, mediaIds, scheduledFor?, coverMediaAssetId? }
export function createPost(body) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Body: any subset of { caption, type, mediaIds, scheduledFor, coverMediaAssetId }
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

// Rodada 3: fetch Instagram insights for a published post.
// Backend returns { insights, cachedAt, isStale, notice? } spread at root.
// Pass { refresh: true } to bypass 1h cache and re-fetch from Meta.
export function getPostInsights(id, { refresh = false } = {}) {
  const qs = refresh ? '?refresh=true' : '';
  return request(`/api/posts/${id}/insights${qs}`);
}