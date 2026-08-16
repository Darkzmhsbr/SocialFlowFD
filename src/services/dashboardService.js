import { request } from './api.js';

export function getStats() {
  return request('/api/dashboard/stats');
}