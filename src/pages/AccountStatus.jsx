import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/states.jsx';
import * as instagramService from '../services/instagramService.js';
import { formatDateTime, formatRelative } from '../utils/formatDate.js';
import '../styles/accountStatus.css';

// Page: /accounts/:id/status
//
// Shows everything the user needs to sanity-check one Instagram account
// at a glance. Meta-derived metrics (followers/follows/media count) are
// best-effort — if the backend couldn't fetch them (expired token,
// missing scope, Meta down), that section quietly disappears. The rest
// of the page always renders.

export default function AccountStatus() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const payload = await instagramService.getAccountStatus(id);
      setData(payload);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Erro ao carregar o status da conta.');
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      // Same flow as ConnectInstagramButton: ask backend for the URL,
      // then hand the browser off to Meta. On return the callback stores
      // fresh credentials on the same account row (upsert by ig user id).
      const url = await instagramService.getAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      alert(`Não foi possível iniciar a reconexão: ${err.message}`);
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!data?.account) return;
    if (!window.confirm(`Desconectar @${data.account.username}? Você poderá reconectar depois, mas seus agendamentos vinculados a esta conta ficarão sem destino.`)) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await instagramService.disconnectAccount(id);
      navigate('/dashboard');
    } catch (err) {
      alert(`Erro ao desconectar: ${err.message}`);
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-account-status__breadcrumb">
          <Link to="/dashboard">← Voltar ao dashboard</Link>
        </div>

        {status === 'loading' && <LoadingState message="Carregando status da conta..." />}
        {status === 'error' && (
          <ErrorState
            message={error}
            onRetry={load}
          />
        )}
        {status === 'success' && data && (
          <AccountStatusContent
            data={data}
            isDisconnecting={isDisconnecting}
            isReconnecting={isReconnecting}
            onReconnect={handleReconnect}
            onDisconnect={handleDisconnect}
          />
        )}
      </main>
    </div>
  );
}

function AccountStatusContent({ data, isDisconnecting, isReconnecting, onReconnect, onDisconnect }) {
  const { account, counts, lastPublished, metaProfile } = data;
  const tokenInfo = describeTokenExpiration(account.tokenExpiresAt);

  return (
    <>
      {/* Identity card */}
      <section className="sf-account-status__identity">
        <div className="sf-account-status__avatar">
          {account.profilePictureUrl ? (
            <img src={account.profilePictureUrl} alt={`Foto de perfil de @${account.username}`} />
          ) : (
            <span>{account.username?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>
        <div className="sf-account-status__identity-body">
          <h1 className="sf-account-status__username">@{account.username}</h1>
          <p className="sf-account-status__type">
            {account.accountType === 'MEDIA_CREATOR' ? 'Conta de criador' : 'Conta profissional'}
          </p>
          <StatusBadge status={account.status} />
        </div>
        <div className="sf-account-status__identity-actions">
          <button
            type="button"
            className="sf-button sf-button--secondary"
            onClick={onReconnect}
            disabled={isReconnecting || isDisconnecting}
          >
            {isReconnecting ? 'Abrindo Meta...' : 'Reconectar'}
          </button>
          <button
            type="button"
            className="sf-button sf-button--danger"
            onClick={onDisconnect}
            disabled={isDisconnecting || isReconnecting}
          >
            {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </div>
      </section>

      {/* Connection metadata */}
      <section className="sf-account-status__section">
        <h2 className="sf-account-status__section-title">Conexão</h2>
        <div className="sf-account-status__grid">
          <MetaTile
            label="Conectada em"
            value={account.connectedAt ? formatDateTime(account.connectedAt) : '—'}
            hint={account.connectedAt ? formatRelative(account.connectedAt) : null}
          />
          <MetaTile
            label="Token expira"
            value={tokenInfo.label}
            hint={tokenInfo.hint}
            tone={tokenInfo.tone}
          />
        </div>
      </section>

      {/* Counters */}
      <section className="sf-account-status__section">
        <h2 className="sf-account-status__section-title">Uso no SocialFlow</h2>
        <div className="sf-account-status__grid">
          <MetaTile label="Posts publicados" value={counts.published.toString()} />
          <MetaTile
            label="Agendados / pendentes"
            value={counts.pending.toString()}
            hint="rascunhos, agendados, na fila e falhas"
          />
        </div>
      </section>

      {/* Last published */}
      <section className="sf-account-status__section">
        <h2 className="sf-account-status__section-title">Último post publicado</h2>
        {lastPublished ? (
          <div className="sf-account-status__last-published">
            <div className="sf-account-status__last-thumb">
              {lastPublished.thumbnailUrl ? (
                lastPublished.thumbnailMediaType === 'VIDEO' ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={lastPublished.thumbnailUrl} muted playsInline preload="metadata" />
                ) : (
                  <img src={lastPublished.thumbnailUrl} alt="" />
                )
              ) : (
                <div className="sf-account-status__thumb-placeholder">Sem mídia</div>
              )}
            </div>
            <div className="sf-account-status__last-body">
              {lastPublished.publishedAt && (
                <p className="sf-account-status__last-date">
                  {formatDateTime(lastPublished.publishedAt)} ({formatRelative(lastPublished.publishedAt)})
                </p>
              )}
              {lastPublished.caption && (
                <p className="sf-account-status__last-caption">
                  {lastPublished.caption.length > 200
                    ? `${lastPublished.caption.slice(0, 200)}...`
                    : lastPublished.caption}
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Nenhum post publicado ainda"
            description="Assim que o worker publicar seu primeiro post por esta conta, ele aparece aqui."
          />
        )}
      </section>

      {/* Meta live metrics — only rendered if backend managed to fetch them */}
      {metaProfile && (
        <section className="sf-account-status__section">
          <h2 className="sf-account-status__section-title">Dados do Instagram</h2>
          <div className="sf-account-status__grid">
            <MetaTile
              label="Seguidores"
              value={formatCount(metaProfile.followersCount)}
            />
            <MetaTile
              label="Seguindo"
              value={formatCount(metaProfile.followsCount)}
            />
            <MetaTile
              label="Publicações totais"
              value={formatCount(metaProfile.mediaCount)}
              hint="conta com todos os posts do perfil, não só os do SocialFlow"
            />
          </div>
        </section>
      )}
    </>
  );
}

function MetaTile({ label, value, hint, tone }) {
  const toneClass = tone ? ` sf-account-status__tile--${tone}` : '';
  return (
    <div className={`sf-account-status__tile${toneClass}`}>
      <p className="sf-account-status__tile-label">{label}</p>
      <p className="sf-account-status__tile-value">{value}</p>
      {hint && <p className="sf-account-status__tile-hint">{hint}</p>}
    </div>
  );
}

function formatCount(value) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR');
}

// Turns a raw ISO expiration date into a friendly label + urgency tone
// (default | warning | error). Missing expiration is treated as unknown
// rather than as "never expires", because Meta long-lived tokens do
// expire — the DB just didn't capture the date.
function describeTokenExpiration(iso) {
  if (!iso) {
    return { label: 'Desconhecido', hint: 'Reconecte para atualizar', tone: 'warning' };
  }
  const expiresAt = new Date(iso);
  if (Number.isNaN(expiresAt.getTime())) {
    return { label: 'Desconhecido', hint: null, tone: 'warning' };
  }
  const now = Date.now();
  const diffMs = expiresAt.getTime() - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    return {
      label: 'Expirado',
      hint: `Expirou em ${formatDateTime(iso)}. Reconecte para continuar publicando.`,
      tone: 'error',
    };
  }
  if (diffDays <= 7) {
    return {
      label: `Expira em ${diffDays} dia${diffDays === 1 ? '' : 's'}`,
      hint: formatDateTime(iso),
      tone: 'error',
    };
  }
  if (diffDays <= 30) {
    return {
      label: `Expira em ${diffDays} dias`,
      hint: formatDateTime(iso),
      tone: 'warning',
    };
  }
  return {
    label: `Expira em ${diffDays} dias`,
    hint: formatDateTime(iso),
  };
}