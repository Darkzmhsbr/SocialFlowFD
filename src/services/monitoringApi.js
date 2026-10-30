import { request } from './api.js';

// Rodada 17: "Monitoramento".
// Returns { monitoring: { summary, accounts: [{ account, health, issues }], telegram, generatedAt } }
export function getMonitoringOverview() {
  return request('/api/monitoring/overview');
}