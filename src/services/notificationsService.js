import { request } from './api.js';

// Rodada 5: header notifications (bell).

// Returns { notifications, unreadCount }
export function listNotifications({ unreadOnly = false, take = 30, skip = 0 } = {}) {
  const params = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (unreadOnly) params.set('unreadOnly', 'true');
  return request(`/api/notifications?${params.toString()}`);
}

// Returns { unreadCount }
export function getUnreadCount() {
  return request('/api/notifications/unread-count');
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'POST' });
}