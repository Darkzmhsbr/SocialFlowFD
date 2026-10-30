import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { BestTimesHeatmap } from '../components/BestTimes.jsx';
import { useAccountFolders } from '../hooks/useAccountFolders.js';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import * as performanceApi from '../services/performanceApi.js';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/performance.css';

// Rodada 18: /performance — "Desempenho".
// Results of each post published by SocialFlow, measured at the same
// checkpoints (24h, 3d, 7d, 30d) so posts of different ages compare
// fairly, each one vs its OWN profile average. Plus format comparison and
// best times to publish.

const PAGE = 50;
const SCOPES = [
  { key: 'all', label: 'Geral' },
  { key: 'folder', label: 'Pasta' },
  { key: 'account', label: 'Perfil' },
];
const CHECKPOINTS = [
  { key: '24h', label: 'Em 24h' },
  { key: '3d', label: 'Em 3 dias' },
  { key: '7d', label: 'Em 7 dias' },
  { key: '30d', label: 'Em 30 dias' },
  { key: 'latest', label: 'Total atual' },
];
const TYPES = ['REEL', 'FEED_VIDEO', 'FEED_IMAGE', 'FEED_CAROUSEL', 'STORY'];
const COLUMNS = [
  { key: 'ratio', label: 'Resultado' },
  { key: 'views', label: 'Visualiz.' },
  { key: 'reach', label: 'Alcance' },
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Coment.' },
  { key: 'shares', label: 'Compart.' },
  { key: 'saves', label: 'Salvos' },
  { key: 'engagement', label: 'Engaj.' },
];
const CHECKPOINT_LABEL = { now: 'total', '24h': '24h', '3d': '3 dias', '7d': '7 dias', '30d': '30 dias' };

const nf = new Intl.NumberFormat('pt-BR');
const nfc = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
export const num = (v) => (v == null ? '—' : v >= 100000 ? nfc.format(v) : nf.format(v));

export function RatioBadge({ ratio, compact = false }) {
  if (ratio == null) return <span className="sf-perf-badge sf-perf-badge--none">{compact ? '—' : 'sem base'}</span>;
  const tone = ratio >= 1.3 ? 'up' : ratio <= 0.7 ? 'down' : 'mid';
  const text = `${String(ratio).replace('.', ',')}×`;
  return (
    <span className={`sf-perf-badge sf-perf-badge--${tone}`} title="Comparado com a média do próprio perfil">
      {tone === 'up' ? '▲ ' : tone === 'down' ? '▼ ' : ''}
      {text}
      {!compact && ' a média'}
    </span>
  );
}

function Thumb({ post }) {
  if (post.thumbnailUrl) return <img className="sf-perf-thumb" src={post.thumbnailUrl} alt="" loading="lazy" />;
  if (post.videoUrl) return <video className="sf-perf-thumb" src={post.videoUrl} muted preload="metadata" />;
  return <span className="sf-perf-thumb sf-perf-thumb--empty">{POST_TYPE_LABELS[post.type]?.slice(0, 5) || '—'}</span>;
}

function toCsv(rows) {
  const head = ['data', 'perfil', 'tipo', 'marco', 'resultado_vs_media', 'visualizacoes', 'alcance', 'curtidas', 'comentarios', 'compartilhamentos', 'salvos', 'engajamento_pct', 'link'];
  const lines = rows.map((r) => [
    formatDateTime(r.post.publishedAt),
    `@${r.account.username}`,
    POST_TYPE_LABELS[r.post.type] || r.post.type,
    CHECKPOINT_LABEL[r.checkpoint] || r.checkpoint,
    r.ratio ?? '',
    r.metrics.views ?? '',
    r.metrics.reach ?? '',
    r.metrics.likes ?? '',
    r.metrics.comments ?? '',
    r.metrics.shares ?? '',
    r.metrics.saves ?? '',
    r.engagementRate ?? '',
    r.post.permalink || '',
  ]);
  return [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
}

export default function Performance() {
  const [scope, setScope] = useState('all');
  const [scopeId, setScopeId] = useState(null);
  const [days, setDays] = useState(30);
  const [type, setType] = useState('');
  const [checkpoint, setCheckpoint] = useState('24h');
  const [sort, setSort] = useState('ratio');
  const [take, setTake] = useState(PAGE);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [best, setBest] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { folders } = useAccountFolders();
  const { accounts } = useInstagramAccounts();

  const ready = scope === 'all' || Boolean(scopeId);
  const filters = useMemo(
    () => ({ scope, id: scope === 'all' ? undefined : scopeId, days, type: type || undefined, checkpoint }),
    [scope, scopeId, days, type, checkpoint]
  );

  const load = useCallback(async () => {
    if (!ready) return;
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }));
    try {
      const { performance } = await performanceApi.getPerformancePosts({ ...filters, sort, take, skip: 0 });
      setState({ status: 'success', data: performance, error: null });
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message });
    }
  }, [filters, sort, take, ready]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setTake(PAGE);
  }, [filters, sort]);

  useEffect(() => {
    if (!ready) return;
    performanceApi
      .getBestTimes({ scope, id: scope === 'all' ? undefined : scopeId, type: type || undefined, days: 90 })
      .then(({ bestTimes }) => setBest(bestTimes))
      .catch(() => setBest(null));
  }, [scope, scopeId, type, ready]);

  const pickScope = (key) => {
    setScope(key);
    setScopeId(key === 'folder' ? folders?.[0]?.id || null : key === 'account' ? accounts?.[0]?.id || null : null);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { performance } = await performanceApi.getPerformancePosts({ ...filters, sort, take: 2000, skip: 0 });
      const blob = new Blob([`﻿${toCsv(performance.rows)}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `desempenho-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const data = state.data;

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Desempenho</h1>
            <p className="sf-page-head__subtitle">
              Quais posts deram certo, qual formato rende mais e em que horário publicar. Cada post é comparado com a média do
              próprio perfil.
            </p>
          </div>
        </div>

        <div className="sf-perf-filters">
          <div className="sf-perf-seg" role="group" aria-label="Escopo">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={scope === s.key}
                className={scope === s.key ? 'is-active' : ''}
                onClick={() => pickScope(s.key)}
                disabled={s.key === 'folder' && !(folders?.length > 0)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {scope === 'folder' && (
            <select className="sf-select" aria-label="Pasta" value={scopeId || ''} onChange={(e) => setScopeId(e.target.value || null)}>
              {!scopeId && <option value="">Escolha a pasta</option>}
              {(folders || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          {scope === 'account' && (
            <select className="sf-select" aria-label="Perfil" value={scopeId || ''} onChange={(e) => setScopeId(e.target.value || null)}>
              {!scopeId && <option value="">Escolha o perfil</option>}
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>
                  @{a.username}
                </option>
              ))}
            </select>
          )}
          <select className="sf-select" aria-label="Período" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Publicados nos últimos 7 dias</option>
            <option value={30}>Publicados nos últimos 30 dias</option>
            <option value={90}>Publicados nos últimos 90 dias</option>
          </select>
          <select className="sf-select" aria-label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
          <select className="sf-select" aria-label="Marco" value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}>
            {CHECKPOINTS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {!ready && <p className="sf-field-hint">Escolha {scope === 'folder' ? 'a pasta' : 'o perfil'}.</p>}
        {state.status === 'loading' && <LoadingState message="Carregando resultados..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

        {data && (
          <div className={`sf-perf-body${state.status === 'refreshing' ? ' is-loading' : ''}`}>
            <p className="sf-perf-totals">
              <strong>{data.totals.withData}</strong> post(s) com resultado
              {data.totals.waiting > 0 && ` · ${data.totals.waiting} aguardando ${checkpoint === 'latest' ? 'a primeira medição' : `o marco "${CHECKPOINTS.find((c) => c.key === checkpoint).label.toLowerCase()}"`}`}
              {data.totals.noPermission > 0 && ` · ${data.totals.noPermission} sem métricas (sem permissão ou removido do Instagram)`}
            </p>

            {data.total === 0 ? (
              <div className="sf-perf-empty">
                <p>
                  <strong>Ainda não há resultados aqui.</strong> As métricas de cada post são coletadas sozinhas 24h, 3 dias, 7
                  dias e 30 dias depois de publicar. Os posts dos últimos 30 dias recebem o total atual na primeira coleta.
                </p>
              </div>
            ) : (
              <>
                {data.highlights.top.length > 0 && (
                  <section className="sf-perf-section">
                    <h2 className="sf-perf-h2">Destaques</h2>
                    <div className="sf-perf-top">
                      {data.highlights.top.map((r, i) => (
                        <a
                          key={r.post.id}
                          className="sf-perf-topcard"
                          href={r.post.permalink || undefined}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="sf-perf-topcard__rank">{i + 1}</span>
                          <Thumb post={r.post} />
                          <span className="sf-perf-topcard__user">@{r.account.username}</span>
                          <strong>
                            {num(r.metrics.views ?? r.metrics.reach)} {r.metrics.views != null ? 'visualiz.' : 'alcance'}
                          </strong>
                          <RatioBadge ratio={r.ratio} compact />
                        </a>
                      ))}
                    </div>
                    <p className="sf-field-hint">
                      {data.highlights.mostShared &&
                        `Mais compartilhado: @${data.highlights.mostShared.account.username} (${num(data.highlights.mostShared.metrics.shares)}). `}
                      {data.highlights.mostSaved &&
                        `Mais salvo: @${data.highlights.mostSaved.account.username} (${num(data.highlights.mostSaved.metrics.saves)}). `}
                      {data.highlights.belowCount > 0 && `${data.highlights.belowCount} post(s) bem abaixo da média do perfil.`}
                    </p>
                  </section>
                )}

                {data.formats.length > 0 && (
                  <section className="sf-perf-section">
                    <h2 className="sf-perf-h2">Por formato</h2>
                    <div className="sf-perf-table-wrap">
                      <table className="sf-perf-table sf-perf-table--formats">
                        <thead>
                          <tr>
                            <th scope="col">Formato</th>
                            <th scope="col">Posts</th>
                            <th scope="col">Visualiz. (média)</th>
                            <th scope="col">Alcance (média)</th>
                            <th scope="col">Engaj. (média)</th>
                            <th scope="col">Compart. (média)</th>
                            <th scope="col">Salvos (média)</th>
                            <th scope="col">vs média do perfil</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.formats.map((f) => (
                            <tr key={f.type}>
                              <th scope="row">{POST_TYPE_LABELS[f.type] || f.type}</th>
                              <td>{f.posts}</td>
                              <td>{num(f.avgViews)}</td>
                              <td>{num(f.avgReach)}</td>
                              <td>{f.avgEngagementRate == null ? '—' : `${String(f.avgEngagementRate).replace('.', ',')}%`}</td>
                              <td>{f.avgShares == null ? '—' : String(f.avgShares).replace('.', ',')}</td>
                              <td>{f.avgSaves == null ? '—' : String(f.avgSaves).replace('.', ',')}</td>
                              <td>
                                <RatioBadge ratio={f.avgRatio} compact />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                <section className="sf-perf-section">
                  <div className="sf-perf-section__head">
                    <h2 className="sf-perf-h2">Ranking de posts</h2>
                    <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={exportCsv} disabled={exporting}>
                      {exporting ? 'Gerando...' : 'Baixar CSV'}
                    </button>
                  </div>
                  <div className="sf-perf-table-wrap">
                    <table className="sf-perf-table">
                      <thead>
                        <tr>
                          <th scope="col">Post</th>
                          {COLUMNS.map((c) => (
                            <th key={c.key} scope="col" aria-sort={sort === c.key ? 'descending' : 'none'}>
                              <button type="button" className={sort === c.key ? 'is-active' : ''} onClick={() => setSort(c.key)}>
                                {c.label}
                                {sort === c.key ? ' ↓' : ''}
                              </button>
                            </th>
                          ))}
                          <th scope="col" aria-label="Link" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((r) => (
                          <tr key={r.post.id}>
                            <th scope="row">
                              <div className="sf-perf-post">
                                <Thumb post={r.post} />
                                <div>
                                  <strong>@{r.account.username}</strong>
                                  <span>
                                    {POST_TYPE_LABELS[r.post.type] || r.post.type} · {formatDateTime(r.post.publishedAt)}
                                    {checkpoint === 'latest' && ` · ${CHECKPOINT_LABEL[r.checkpoint]}`}
                                  </span>
                                  {r.post.caption && <span className="sf-perf-post__caption">{r.post.caption}</span>}
                                </div>
                              </div>
                            </th>
                            <td>
                              <RatioBadge ratio={r.ratio} compact />
                            </td>
                            <td>{num(r.metrics.views)}</td>
                            <td>{num(r.metrics.reach)}</td>
                            <td>{num(r.metrics.likes)}</td>
                            <td>{num(r.metrics.comments)}</td>
                            <td>{num(r.metrics.shares)}</td>
                            <td>{num(r.metrics.saves)}</td>
                            <td>{r.engagementRate == null ? '—' : `${String(r.engagementRate).replace('.', ',')}%`}</td>
                            <td>
                              {r.post.permalink && (
                                <a className="sf-perf-link" href={r.post.permalink} target="_blank" rel="noreferrer">
                                  Ver ↗
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.total > data.rows.length && (
                    <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => setTake((t) => t + PAGE)}>
                      Carregar mais ({data.total - data.rows.length})
                    </button>
                  )}
                  <p className="sf-field-hint">
                    "Resultado" = visualizações (vídeos e Reels) ou alcance (fotos, carrosséis, stories) comparados com a média do
                    mesmo perfil no mesmo marco. Aparece com pelo menos 5 posts de base.
                  </p>
                </section>
              </>
            )}

            <section className="sf-perf-section">
              <h2 className="sf-perf-h2">Melhores horários</h2>
              {best ? <BestTimesHeatmap data={best} /> : <p className="sf-field-hint">Carregando...</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}