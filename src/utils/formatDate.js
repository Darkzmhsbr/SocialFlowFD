// Small date helpers used across post cards and the composer. No date lib
// on purpose - Intl.DateTimeFormat covers what we need without adding weight.

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function formatDate(input) {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMATTER.format(date);
}

export function formatDateTime(input) {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return DATETIME_FORMATTER.format(date);
}

export function formatRelative(input) {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const diffHour = Math.round(diffMs / 3600000);
  const diffDay = Math.round(diffMs / 86400000);

  if (Math.abs(diffMin) < 60) return RELATIVE_FORMATTER.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return RELATIVE_FORMATTER.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 30) return RELATIVE_FORMATTER.format(diffDay, 'day');
  return formatDate(date);
}

// Turns a Date into the string an <input type="datetime-local"> accepts.
// The picker cannot handle timezone suffixes, so we strip UTC info and
// emit the local components.
export function toDateTimeLocalValue(input) {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}