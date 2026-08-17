import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import '../styles/instagramAccountCard.css';

export default function InstagramAccountCard({ account, onDisconnect }) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!window.confirm(`Desconectar @${account.username}?`)) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect(account.id);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="sf-account-card">
      <div className="sf-account-card__avatar">
        {account.profilePictureUrl ? (
          <img src={account.profilePictureUrl} alt={`Foto de perfil de @${account.username}`} />
        ) : (
          <span>{account.username?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>

      <div className="sf-account-card__info">
        <p className="sf-account-card__username">@{account.username}</p>
        <p className="sf-account-card__type">
          {account.accountType === 'MEDIA_CREATOR' ? 'Conta de criador' : 'Conta profissional'}
        </p>
        <StatusBadge status={account.status} />
      </div>

      <div className="sf-account-card__actions">
        <Link
          className="sf-button sf-button--secondary"
          to={`/accounts/${account.id}/status`}
        >
          Gerenciar
        </Link>
        <button
          type="button"
          className="sf-button sf-button--danger"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
        </button>
      </div>
    </div>
  );
}