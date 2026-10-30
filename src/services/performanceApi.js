import { request } from './api.js';

// Rodada 18: "Desempenho".

function params(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  return p.toString();
}

// filters: { scope, id, ids, days, type, checkpoint, sort, take, skip }
// Returns { performance: { label, totals, rows, total, highlights, formats } }
export function getPerformancePosts(filters = {}) {
  return request(`/api/performance/posts?${params(filters)}`);
}

// filters: { scope, id, ids, days, type }
// Returns { bestTimes: { cells, rows, cols, best, summary, totalPosts, minSample, weekdays, blocks } }
export function getBestTimes(filters = {}) {
  return request(`/api/performance/best-times?${params(filters)}`);
}