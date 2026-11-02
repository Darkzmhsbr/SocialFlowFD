import { Link } from 'react-router-dom';

// Rodada 21: storage usage bar. Full version (page Armazenamento) shows the
// legend with each group; compact version (Biblioteca) is one line + bar.

export const STORAGE_GROUPS = [
  { key: 'library', label: 'Biblioteca', color: '#3987e5' },
  { key: 'published', label: 'Posts publicados (liberáveis)', color: '#199e70' },
  { key: 'pending', label: 'Aguardando publicação', color: '#c98500' },
  { key: 'orphan', label: 'Envios sem uso', color: '#d55181' },
];

const MB = 1024 * 1024;
const GB = 1024 * MB;

export function formatStorage(bytes) {
  const b = Number(bytes) || 0;
  if (b >= GB) return `${(b / GB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
  if (b >= MB) return `${Math.round(b / MB).toLocaleString('pt-BR')} MB`;
  if (b > 0) return '< 1 MB';
  return '0 MB';
}

export function usageLine(storage) {
  if (!storage) return '';
  if (storage.unlimited) return `${formatStorage(storage.usedBytes)} usados · sem limite`;
  return `${formatStorage(storage.usedBytes)} de ${formatStorage(storage.quotaBytes)}`;
}

export default function StorageBar({ storage, compact = false }) {
  if (!storage) return null;
  const total = storage.unlimited ? Math.max(storage.usedBytes, 1) : Math.max(storage.quotaBytes || 1, 1);
  const pct = storage.percent;
  const tone = pct === null || pct === undefined ? '' : pct >= 100 ? ' is-full' : pct >= 90 ? ' is-high' : '';

  const segments = STORAGE_GROUPS.map((g) => ({
    ...g,
    bytes: storage.breakdown?.[g.key]?.bytes || 0,
    count: storage.breakdown?.[g.key]?.count || 0,
  }));

  const bar = (
    <div
      className="sf-storage-bar"
      role="img"
      aria-label={`Armazenamento: ${usageLine(storage)}${pct !== null && pct !== undefined ? ` (${pct}%)` : ''}`}
    >
      {segments.map((s) =>
        s.bytes > 0 ? (
          <span
            key={s.key}
            className="sf-storage-bar__seg"
            style={{ width: `${Math.max(0.6, (s.bytes / total) * 100)}%`, background: s.color }}
            title={`${s.label}: ${formatStorage(s.bytes)}`}
          />
        ) : null
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={`sf-storage-compact${tone}`}>
        <div className="sf-storage-compact__line">
          <span>
            <strong>Armazenamento:</strong> {usageLine(storage)}
            {pct !== null && pct !== undefined && <span className="sf-storage-pct"> · {String(pct).replace('.', ',')}%</span>}
          </span>
          <Link to="/storage">Detalhes</Link>
        </div>
        {bar}
        {tone === ' is-full' && <p className="sf-storage-warn">Espaço esgotado: novos envios estão bloqueados até liberar espaço.</p>}
      </div>
    );
  }

  return (
    <div className={`sf-storage-full${tone}`}>
      <div className="sf-storage-full__head">
        <span className="sf-storage-full__value">{usageLine(storage)}</span>
        {pct !== null && pct !== undefined && <span className="sf-storage-pct">{String(pct).replace('.', ',')}% usado</span>}
      </div>
      {bar}
      <ul className="sf-storage-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="sf-storage-legend__dot" style={{ background: s.color }} aria-hidden="true" />
            <span className="sf-storage-legend__label">{s.label}</span>
            <span className="sf-storage-legend__value">
              {formatStorage(s.bytes)} · {s.count} arquivo{s.count === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}