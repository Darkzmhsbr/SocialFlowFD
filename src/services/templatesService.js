import { request } from './api.js';

// Rodada 16: "Modelos" (caption + hashtags + type + destination folder).

// Returns { templates: [{ id, name, type, caption, hashtags, hashtagCount, finalCaption, folder, usageCount, lastUsedAt }] }
export function listTemplates() {
  return request('/api/templates');
}

// Body: { name, type?, caption?, hashtags?, accountFolderId? } -> { template }
export function createTemplate(body) {
  return request('/api/templates', { method: 'POST', body: JSON.stringify(body) });
}

export function updateTemplate(id, body) {
  return request(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteTemplate(id) {
  return request(`/api/templates/${id}`, { method: 'DELETE' });
}

// Counts a use (the most recently used templates come first).
export function markTemplateUsed(id) {
  return request(`/api/templates/${id}/use`, { method: 'POST' });
}