import { request } from './api.js';

// Rodada 17: alerts on Telegram (official bot). Every call returns
// { telegram: { configured, bot, link, alertTypes } } with the fresh status.

export function getTelegramStatus() {
  return request('/api/telegram/status');
}

// "SF-XXXXXX" code for private chat, group or a channel post.
export function createTelegramLinkCode() {
  return request('/api/telegram/link-code', { method: 'POST' });
}

// Channel/group by id or @username: the bot posts a 6-digit code there.
export function connectTelegramChat(chatId) {
  return request('/api/telegram/connect', { method: 'POST', body: JSON.stringify({ chatId }) });
}

export function confirmTelegramChat(code) {
  return request('/api/telegram/confirm', { method: 'POST', body: JSON.stringify({ code }) });
}

export function saveTelegramAlerts(alertTypes) {
  return request('/api/telegram/alerts', { method: 'PUT', body: JSON.stringify({ alertTypes }) });
}

export function sendTelegramTest() {
  return request('/api/telegram/test', { method: 'POST' });
}

export function disconnectTelegram() {
  return request('/api/telegram/link', { method: 'DELETE' });
}