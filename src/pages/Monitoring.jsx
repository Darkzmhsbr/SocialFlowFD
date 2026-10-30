import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import TelegramAlertsCard from '../components/TelegramAlertsCard.jsx';
import * as monitoringApi from '../services/monitoringApi.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/monitoring.css';
// Rodada 19A: "Republicar falhas" (Publicar agora, spaced) per profile.
import * as postsService from '../services/postsService.js';

// Rodada 17: /monitoring — "Monitoramento".
// Health of every profile with the cause and what to do, operation counters
// and the Telegram alerts card. Refreshes every minute.

const FILTERS = [
  { key: 'problems', label: 'Com problema' },
  { key: 'critical', label: 'Críticos' },
  { key: 'all', label: 'Todos' },
];
const HEALTH = {
  critical: { label: 'Crítico', icon: '●' },
  warning: { label: 'Atenção', icon: '▲' },
  attention: { label: 'Aviso', icon: '◆' },
  ok: { label: 'Saudável', icon: '✓' },
};
const ISSUE_ICON = { critical: '●', warning: '▲', info: '◆' };
const REFRESH_MS = 60 * 1000;

export default function Monitoring() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [filter, setFilter] = useState('problems');
  // Rodada 19A
  const [republishing, setRepublishing] = useState(null);
  const [notice, setNotice] = useState(null);

  const republish = async (username, { accountId, count }) => {
    if (!window.confirm(`Publicar agora as ${count} falha(s) de @${username}? Elas saem espaçadas, uma de cada vez.`)) return;
    setRepublishing(accountId);
    setNotice(null);
    try {
      const { result } = await postsService.bulkPosts({ action: 'publish-now', filter: { accountId, status: 'FAILED' } });
      setNotice({ tone: 'success', text: `✓ ${result.affected} post(s) de @${username} voltaram para a fila.` });
      load();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setRepublishing(null);
    }
  };

  const load = useCallback(async () => {
    try {
      const { monitoring } = await monitoringApi.getMonitoringOverview();
      setState({ status: 'success', data: monitoring, error: null });
    } catch (err) {
      setState((s) => ({ status: s.data ? 'success' : 'error', data: s.data, error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const data = state.data;
  const s = data?.summary;
  const rows = (data?.accounts || []).filter((r) =>
    filter === 'all' ? true : filter === 'critical' ? r.health === 'critical' : r.health !== 'ok'
  );

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Monitoramento</h1>
            <p className="sf-page-head__subtitle">
              A saúde de todos os perfis num lugar só: o que está errado, por quê e o que fazer.
            </p>
          </div>
          <div className="sf-page-head__actions">
            {data && <span className="sf-field-hint">Atualizado {formatDateTime(data.generatedAt)}</span>}
            <button type="button" className="sf-button sf-button--secondary" onClick={load}>
              Atualizar
            </button>
          </div>
        </div>

        {state.status === 'loading' && <LoadingState message="Verificando os perfis..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

        {data && (
          <div className="sf-mon-layout">
            <div className="sf-mon-main">
              <div className="sf-mon-tiles">
                <Tile tone="ok" value={`${s.healthy}/${s.accounts}`} label="Perfis saudáveis" />
                <Tile tone={s.critical ? 'critical' : 'ok'} value={s.critical} label="Precisam de ação" />
                <Tile tone={s.warning ? 'warning' : 'ok'} value={s.warning} label="Em atenção" />
                <Tile tone={s.paused ? 'warning' : 'ok'} value={s.paused} label="Pausados agora" />
                <Tile tone={s.tokensExpiring ? 'warning' : 'ok'} value={s.tokensExpiring} label="Autorização vencendo" />
                <Tile tone={s.emptyQueue ? 'attention' : 'ok'} value={s.emptyQueue} label="Sem fila (24h)" />
                <Tile
                  tone={s.successRate7d == null ? 'ok' : s.successRate7d < 90 ? 'warning' : 'ok'}
                  value={s.successRate7d == null ? '—' : `${String(s.successRate7d).replace('.', ',')}%`}
                  label={`Sucesso 7 dias (${s.published7d} ok · ${s.failed7d} falhas)`}
                />
                <Tile tone={s.failures24h ? 'warning' : 'ok'} value={s.failures24h} label="Falhas nas últimas 24h" />
              </div>

              <div className="sf-mon-filter" role="group" aria-label="Filtro">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={filter === f.key}
                    className={filter === f.key ? 'is-active' : ''}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {rows.length === 0 && (
                <div className="sf-mon-empty">
                  {data.accounts.length === 0 ? (
                    <>
                      <p>Nenhum perfil conectado ainda.</p>
                      <Link className="sf-button sf-button--primary sf-button--small" to="/accounts">
                        Conectar perfil
                      </Link>
                    </>
                  ) : (
                    <p>✓ Tudo certo por aqui: nenhum perfil com problema.</p>
                  )}
                </div>
              )}

              {/* Rodada 19A */}
              {notice && <p className={`sf-tg__msg sf-tg__msg--${notice.tone}`}>{notice.text}</p>}

              <ul className="sf-mon-list">
                {rows.map((r) => (
                  <li key={r.account.id} className={`sf-mon-row sf-mon-row--${r.health}`}>
                    <div className="sf-mon-row__head">
                      {r.account.profilePictureUrl ? (
                        <img className="sf-mon-avatar" src={r.account.profilePictureUrl} alt="" />
                      ) : (
                        <span className="sf-mon-avatar" aria-hidden="true">
                          {(r.account.username || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <strong>@{r.account.username}</strong>
                      <span className={`sf-mon-health sf-mon-health--${r.health}`}>
                        <span aria-hidden="true">{HEALTH[r.health].icon}</span> {HEALTH[r.health].label}
                      </span>
                    </div>
                    {r.issues.length > 0 && (
                      <ul className="sf-mon-issues">
                        {r.issues.map((i) => (
                          <li key={i.key} className={`sf-mon-issue sf-mon-issue--${i.severity}`}>
                            <span className="sf-mon-issue__icon" aria-hidden="true">
                              {ISSUE_ICON[i.severity]}
                            </span>
                            <div>
                              <strong>{i.title}</strong>
                              <span>{i.cause}</span>
                            </div>
                            {/* Rodada 19A: failures of an active profile -> republish in one click */}
                            {i.republish ? (
                              <button
                                type="button"
                                className="sf-button sf-button--primary sf-button--small"
                                onClick={() => republish(r.account.username, i.republish)}
                                disabled={republishing !== null}
                              >
                                {republishing === i.republish.accountId ? 'Enviando...' : 'Republicar falhas'}
                              </button>
                            ) : i.action?.to ? (
                              <Link className="sf-button sf-button--secondary sf-button--small" to={i.action.to}>
                                {i.action.label}
                              </Link>
                            ) : (
                              i.action && <span className="sf-mon-issue__note">{i.action.label}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="sf-mon-side">
              <TelegramAlertsCard initial={data.telegram} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Tile({ value, label, tone }) {
  return (
    <div className={`sf-mon-tile sf-mon-tile--${tone}`}>
      <span className="sf-mon-tile__value">{value}</span>
      <span className="sf-mon-tile__label">{label}</span>
    </div>
  );
}