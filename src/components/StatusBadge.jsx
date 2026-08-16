import '../styles/badge.css';

// Labels for every status this badge may render. Instagram account statuses
// (ACTIVE / TOKEN_EXPIRED / REVOKED / ERROR) share the widget with post
// statuses (DRAFT / SCHEDULED / QUEUED / PUBLISHING / PUBLISHED / FAILED /
// ARCHIVED). Adding new ones only requires extending this map and the tone
// resolver below.
const LABELS = {
  // Instagram account
  ACTIVE: 'Conectada',
  TOKEN_EXPIRED: 'Token expirado',
  REVOKED: 'Desconectada',
  ERROR: 'Erro',
  // Scheduled post
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  QUEUED: 'Na fila',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicado',
  FAILED: 'Falhou',
  ARCHIVED: 'Arquivado',
};

function resolveTone(status) {
  if (status === 'ACTIVE' || status === 'PUBLISHED') return 'success';
  if (status === 'ERROR' || status === 'FAILED') return 'error';
  if (status === 'TOKEN_EXPIRED' || status === 'QUEUED' || status === 'PUBLISHING') return 'warning';
  if (status === 'SCHEDULED') return 'accent';
  return 'neutral';
}

export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  const tone = resolveTone(status);

  return (
    <span className={`sf-badge sf-badge--${tone}`}>
      <span className="sf-badge__dot" />
      {label}
    </span>
  );
}