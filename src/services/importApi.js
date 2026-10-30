import { request } from './api.js';

// Rodada 19B: spreadsheet import + weekly report.

// rows: [{ line, profile, files, caption, date, time, type, cover }]
// Returns { preview: { rows, summary } }
export function previewImport(rows) {
  return request('/api/imports/preview', { method: 'POST', body: JSON.stringify({ rows }) });
}

// Returns { import: { created, skipped, failed, batchId } }
export function commitImport(rows, batchId = null) {
  return request('/api/imports/commit', { method: 'POST', body: JSON.stringify({ rows, batchId }) });
}

// Returns { media: [{ name, type, inLibrary, folder, createdAt }] }
export function listImportMedia() {
  return request('/api/imports/media');
}

// Returns { weeks: [{ week, label }] }
export function listReportWeeks() {
  return request('/api/reports/weeks');
}

// Returns { report, text }
export function getWeeklyReport(week) {
  return request(`/api/reports/weekly${week ? `?week=${week}` : ''}`);
}