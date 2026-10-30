import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as postsService from '../services/postsService.js';
import { formatRelative } from '../utils/formatDate.js';
import '../styles/postInsights.css';
// Rodada 18: evolution 24h -> 30d + comparison with the profile average.
import '../styles/performance.css';

const CHECKPOINT_LABEL = { now: 'Total', '24h': '24h', '3d': '3 dias', '7d': '7 dias', '30d': '30 dias' };
const HISTORY_METRICS = [
  { key: 'views', label: 'Visualizações' },
  { key: 'reach', label: 'Alcance' },
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Comentários' },
  { key: 'shares', label: 'Compart.' },
  { key: 'saves', label: 'Salvos' },
];

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

      {/* Rodada 18: result vs the profile's own average */}
      {data.performance?.ratio != null && (
        <div className={`sf-insights-modal__compare sf-insights-modal__compare--${data.performance.rating}`}>
          <strong>
            {data.performance.rating === 'above' ? '▲ ' : data.performance.rating === 'below' ? '▼ ' : ''}
            {String(data.performance.ratio).replace('.', ',')}× a média do perfil
          </strong>
          <span>
            {data.performance.metric === 'views' ? 'Visualizações' : 'Alcance'} {CHECKPOINT_LABEL[data.performance.checkpoint] === 'Total' ? 'até agora' : `em ${CHECKPOINT_LABEL[data.performance.checkpoint]}`}, comparado com os outros posts do mesmo perfil.
          </span>
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

      {/* Rodada 18: how the post evolved (collected automatically) */}
      {data.history?.length > 0 && (
        <div className="sf-insights-modal__history">
          <span className="sf-insights-modal__history-title">Evolução</span>
          <div className="sf-insights-modal__history-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Marco</th>
                  {HISTORY_METRICS.filter((m) => data.history.some((h) => h[m.key] != null)).map((m) => (
                    <th key={m.key} scope="col">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.checkpoint}>
                    <th scope="row">{CHECKPOINT_LABEL[h.checkpoint] || h.checkpoint}</th>
                    {HISTORY_METRICS.filter((m) => data.history.some((x) => x[m.key] != null)).map((m) => (
                      <td key={m.key}>{h[m.key] == null ? '—' : h[m.key].toLocaleString('pt-BR')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="sf-insights-modal__footer">
        {/* Rodada 18 */}
        {data.permalink && (
          <a className="sf-insights-modal__permalink" href={data.permalink} target="_blank" rel="noreferrer">
            Ver no Instagram ↗
          </a>
        )}
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