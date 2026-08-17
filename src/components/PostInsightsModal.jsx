import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as postsService from '../services/postsService.js';
import { formatRelative } from '../utils/formatDate.js';
import '../styles/postInsights.css';

// Modal that renders on top of the PostCard when "Métricas" is clicked.
// Fetches insights on open (first time hits Meta, then cache for 1h).
// Handles three expected "not-an-error" states gracefully:
//   INSIGHTS_SCOPE_MISSING → link to reconnect the account
//   INSIGHTS_NOT_YET_READY → "aguarde" banner
//   INSIGHTS_UNAVAILABLE   → deleted on IG or Story expired

export default function PostInsightsModal({ postId, accountId, onClose }) {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setStatus('loading');
      setError(null);
      try {
        const result = await postsService.getPostInsights(postId, { refresh });
        setData(result);
        setStatus('success');
      } catch (err) {
        setError(err);
        setStatus('error');
      } finally {
        setIsRefreshing(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent scroll behind modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="sf-insights-overlay" onClick={onClose}>
      <div className="sf-insights-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sf-insights-modal__header">
          <h2 className="sf-insights-modal__title">Métricas do post</h2>
          <button
            type="button"
            className="sf-icon-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="sf-insights-modal__body">
          {status === 'loading' && <LoadingContent />}
          {status === 'error' && (
            <ErrorContent error={error} accountId={accountId} onRetry={() => load(true)} />
          )}
          {status === 'success' && data && (
            <SuccessContent
              data={data}
              isRefreshing={isRefreshing}
              onRefresh={() => load(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingContent() {
  return (
    <div className="sf-insights-modal__loading">
      <p>Carregando métricas...</p>
    </div>
  );
}

function ErrorContent({ error, accountId, onRetry }) {
  const code = error?.code;

  if (code === 'INSIGHTS_SCOPE_MISSING') {
    return (
      <div className="sf-insights-modal__empty">
        <p className="sf-insights-modal__empty-icon">🔒</p>
        <p className="sf-insights-modal__empty-title">Permissão necessária</p>
        <p className="sf-insights-modal__empty-desc">
          A conta Instagram precisa ser reconectada para habilitar métricas.
        </p>
        {accountId && (
          <Link
            className="sf-button sf-button--primary"
            to={`/accounts/${accountId}/status`}
          >
            Ir para a página da conta
          </Link>
        )}
      </div>
    );
  }

  if (code === 'INSIGHTS_UNAVAILABLE') {
    return (
      <div className="sf-insights-modal__empty">
        <p className="sf-insights-modal__empty-icon">📭</p>
        <p className="sf-insights-modal__empty-title">Métricas indisponíveis</p>
        <p className="sf-insights-modal__empty-desc">
          {error?.message || 'As métricas deste post não estão disponíveis.'}
        </p>
      </div>
    );
  }

  return (
    <div className="sf-insights-modal__empty">
      <p className="sf-insights-modal__empty-icon">⚠️</p>
      <p className="sf-insights-modal__empty-title">Erro ao carregar</p>
      <p className="sf-insights-modal__empty-desc">
        {error?.message || 'Algo deu errado. Tente novamente.'}
      </p>
      <button type="button" className="sf-button sf-button--secondary" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}

function SuccessContent({ data, isRefreshing, onRefresh }) {
  const { insights, cachedAt, notice } = data;
  const isNotYetReady = notice === 'INSIGHTS_NOT_YET_READY';

  return (
    <>
      {isNotYetReady && (
        <div className="sf-insights-modal__notice">
          ⏳ Este post foi publicado recentemente. As métricas do Instagram podem
          levar até 30 minutos para aparecer. Use o botão "Atualizar" daqui a pouco.
        </div>
      )}

      {insights && insights.length > 0 ? (
        <div className="sf-insights-modal__grid">
          {insights.map((metric) => (
            <div key={metric.name} className="sf-insights-modal__tile">
              <span className="sf-insights-modal__tile-icon">{metric.icon}</span>
              <span className="sf-insights-modal__tile-value">
                {metric.value.toLocaleString('pt-BR')}
              </span>
              <span className="sf-insights-modal__tile-label">{metric.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="sf-insights-modal__empty">
          <p className="sf-insights-modal__empty-icon">📊</p>
          <p className="sf-insights-modal__empty-title">Nenhuma métrica</p>
          <p className="sf-insights-modal__empty-desc">
            O Instagram ainda não reportou métricas para este post.
          </p>
        </div>
      )}

      <div className="sf-insights-modal__footer">
        {cachedAt && (
          <span className="sf-insights-modal__cached-at">
            Atualizado {formatRelative(cachedAt)}
          </span>
        )}
        <button
          type="button"
          className="sf-button sf-button--secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </>
  );
}