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

// --- Rodada 4: multi-profile batch posting ------------------------------

// Body: { instagramAccountIds, type, items: [{ mediaIds, caption?, coverMediaAssetId? }],
//         caption?, coverMediaAssetId?, scheduledFor?, stagger?, useSpintax? }
// Returns { batch: { batchId, total, accounts, byStatus, firstScheduledFor, lastScheduledFor } }
export function createPostBatch(body) {
  return request('/api/posts/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Returns { batch, posts }
export function getPostBatch(batchId) {
  return request(`/api/posts/batch/${batchId}`);
}

// Returns { archived: { batchId, archived, skipped } }
export function archivePostBatch(batchId) {
  return request(`/api/posts/batch/${batchId}/archive`, { method: 'POST' });
}

// Returns { deleted: { batchId, deleted, skipped } }
export function deletePostBatch(batchId) {
  return request(`/api/posts/batch/${batchId}`, { method: 'DELETE' });
}

// --- Rodada 4.1: pagination + batch limits -------------------------------

// GET /api/posts?status=&accountId=&take=&skip=
// Returns { posts, total, take, skip }
export function listPostsPage({ status, accountId, take = 50, skip = 0 } = {}) {
  const params = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (status) params.set('status', status);
  if (accountId) params.set('accountId', accountId);
  return request(`/api/posts?${params.toString()}`);
}

// Returns { limits: { maxItems, maxAccounts, maxPosts, defaultWindowMinutes, defaultItemIntervalMinutes } }
export function getBatchLimits() {
  return request('/api/posts/batch/limits');
}

// --- Rodada 5: "Publicar agora" -----------------------------------------

// Returns { post, notice }
export function publishPostNow(id) {
  return request(`/api/posts/${id}/publish-now`, { method: 'POST' });
}

// Body: { intervalMinutes?, windowMinutes? }
// Returns { requeued: { batchId, requeued, skippedInactive, firstAt, lastAt } }
export function publishPostBatchNow(batchId, body = {}) {
  return request(`/api/posts/batch/${batchId}/publish-now`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// --- Rodada 6: Agendamentos page -----------------------------------------

function buildFilterParams({ status, types, accountId, q } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (Array.isArray(types) && types.length > 0) params.set('types', types.join(','));
  if (accountId) params.set('accountId', accountId);
  if (q) params.set('q', q);
  return params;
}

// Returns { posts, total, take, skip }
export function queryPosts({ take = 50, skip = 0, ...filters } = {}) {
  const params = buildFilterParams(filters);
  params.set('take', String(take));
  params.set('skip', String(skip));
  return request(`/api/posts/query?${params.toString()}`);
}

// Returns { byStatus, byType, nextScheduled }
export function getPostsOverview(filters = {}) {
  return request(`/api/posts/overview?${buildFilterParams(filters).toString()}`);
}

// Body: { action: 'delete'|'archive'|'publish-now', ids?, filter?, intervalMinutes?, windowMinutes? }
// Returns { result: { action, matched, affected, skipped } }
export function bulkPosts(body) {
  return request('/api/posts/bulk', { method: 'POST', body: JSON.stringify(body) });
}