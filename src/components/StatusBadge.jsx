import '../styles/badge.css';

const LABELS = {
  ACTIVE: 'Conectada',
  TOKEN_EXPIRED: 'Token expirado',
  REVOKED: 'Desconectada',
  ERROR: 'Erro',
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  const tone = status === 'ACTIVE' ? 'success' : status === 'ERROR' ? 'error' : 'neutral';

  return (
    <span className={`sf-badge sf-badge--${tone}`}>
      <span className="sf-badge__dot" />
      {label}
    </span>
  );
}
