import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccountFolders } from '../hooks/useAccountFolders.js';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import * as metricsService from '../services/metricsService.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/metrics.css';

// Rodada 13: Instagram metrics on the Dashboard.
//   Escopo  : Geral (all profiles) / Pasta / Perfil
//   Período : 7 / 30 / 90 days (ends on the last complete day)
//   Blocks  : KPI tiles (vs previous period), daily chart, ranking of
//             profiles or folders (click a row to drill down).
// Data comes from the daily snapshot collected by the backend.

const PERIODS = [7, 30, 90];
const SCOPES = [
  { key: 'all', label: 'Geral' },
  { key: 'folder', label: 'Pasta' },
  { key: 'account', label: 'Perfil' },
];
const CHART_METRICS = [
  { key: 'views', label: 'Visualizações' },
  { key: 'reach', label: 'Alcance' },
  { key: 'totalInteractions', label: 'Interações' },
  { key: 'followers', label: 'Seguidores' },
];
const RANK_COLUMNS = [
  { key: 'followers', label: 'Seguidores' },
  { key: 'followersDelta', label: 'Crescimento' },
  { key: 'views', label: 'Visualizações' },
  { key: 'reach', label: 'Alcance' },
  { key: 'interactions', label: 'Interações' },
  { key: 'published', label: 'Posts' },
];
const STORAGE_KEY = 'sf_metrics_view';
const RANK_PREVIEW = 10;

const nf = new Intl.NumberFormat('pt-BR');
const nfCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatNumber(value) {
  if (value == null) return '—';
  return Math.abs(value) >= 100000 ? nfCompact.format(value) : nf.format(value);
}

function formatSigned(value) {
  if (!value) return '0';
  return `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

function shortDate(day) {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

// % change vs previous period; null when there's nothing to compare with.
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (v && SCOPES.some((s) => s.key === v.scope) && PERIODS.includes(v.days)) return v;
  } catch {
    // ignore
  }
  return { scope: 'all', id: null, days: 30 };
}

export default function MetricsPanel() {
  const [view, setView] = useState(readSaved);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [chartMetric, setChartMetric] = useState('views');
  const [rankTab, setRankTab] = useState('accounts');
  const [sort, setSort] = useState('views');
  const [showAll, setShowAll] = useState(false);
  const [refreshNote, setRefreshNote] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { folders } = useAccountFolders();
  const { accounts } = useInstagramAccounts();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
      // ignore
    }
  }, [view]);

  const ready = view.scope === 'all' || Boolean(view.id);

  const load = useCallback(async () => {
    if (!ready) return;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const { metrics } = await metricsService.getMetricsOverview(view);
      setState({ status: 'success', data: metrics, error: null });
    } catch (err) {
      // A folder/profile that no longer exists: back to Geral.
      if (err.status === 404 && view.scope !== 'all') {
        setView((v) => ({ ...v, scope: 'all', id: null }));
        return;
      }
      setState({ status: 'error', data: null, error: err.message });
    }
  }, [view, ready]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setShowAll(false);
    if (view.scope !== 'all') setRankTab('accounts');
  }, [view.scope, view.id]);

  const setScope = (scope) => {
    if (scope === view.scope) return;
    let id = null;
    if (scope === 'folder') id = folders?.[0]?.id || null;
    if (scope === 'account') id = accounts?.[0]?.id || null;
    setView((v) => ({ ...v, scope, id }));
  };

  const refresh = async () => {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const { refresh: r } = await metricsService.refreshMetrics();
      if (r.started) {
        setRefreshNote(`Coletando ${r.pending} perfil(is)... os números aparecem em alguns minutos.`);
        setTimeout(load, 60 * 1000);
      } else if (r.retryInMinutes) {
        setRefreshNote(`Coleta já pedida há pouco. Tente de novo em ${r.retryInMinutes} min.`);
      } else {
        setRefreshNote('Tudo atualizado: todos os perfis ativos já têm os números do último dia.');
      }
    } catch (err) {
      setRefreshNote(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const data = state.data;
  const hasData = data && data.coverage.withData > 0;

  return (
    <section className="sf-card sf-metrics" aria-label="Métricas do Instagram">
      <div className="sf-metrics__head">
        <div>
          <h2 className="sf-metrics__title">Métricas do Instagram</h2>
          {data && (
            <p className="sf-field-hint">
              {data.label} · {shortDate(data.range.from)} a {shortDate(data.range.to)} · {data.coverage.accounts} perfil(is)
            </p>
          )}
        </div>
        <div className="sf-metrics__controls">
          <div className="sf-metrics__segmented" role="group" aria-label="Escopo">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={view.scope === s.key}
                className={view.scope === s.key ? 'is-active' : ''}
                onClick={() => setScope(s.key)}
                disabled={s.key === 'folder' && !(folders?.length > 0)}
                title={s.key === 'folder' && !(folders?.length > 0) ? 'Crie uma pasta em Pastas' : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
          {view.scope === 'folder' && (
            <select
              className="sf-select"
              aria-label="Pasta"
              value={view.id || ''}
              onChange={(e) => setView((v) => ({ ...v, id: e.target.value || null }))}
            >
              {!view.id && <option value="">Escolha a pasta</option>}
              {(folders || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          {view.scope === 'account' && (
            <select
              className="sf-select"
              aria-label="Perfil"
              value={view.id || ''}
              onChange={(e) => setView((v) => ({ ...v, id: e.target.value || null }))}
            >
              {!view.id && <option value="">Escolha o perfil</option>}
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>
                  @{a.username}
                </option>
              ))}
            </select>
          )}
          <div className="sf-metrics__segmented" role="group" aria-label="Período">
            {PERIODS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={view.days === d}
                className={view.days === d ? 'is-active' : ''}
                onClick={() => setView((v) => ({ ...v, days: d }))}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {!ready && <p className="sf-field-hint">Escolha {view.scope === 'folder' ? 'a pasta' : 'o perfil'} para ver as métricas.</p>}
      {ready && state.status === 'loading' && !data && <p className="sf-field-hint">Carregando métricas...</p>}
      {state.status === 'error' && (
        <div className="sf-metrics__notice">
          <p>{state.error}</p>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={load}>
            Tentar de novo
          </button>
        </div>
      )}

      {ready && data && !hasData && (
        <div className="sf-metrics__notice">
          <p>
            <strong>As métricas ainda estão sendo preparadas.</strong> A coleta é automática uma vez por dia (a partir
            das 06h) e já traz os últimos 7 dias de visualizações e alcance. Os seguidores passam a ser acompanhados a
            partir da primeira coleta.
          </p>
          <button type="button" className="sf-button sf-button--primary sf-button--small" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Pedindo...' : 'Coletar agora'}
          </button>
          {refreshNote && <p className="sf-field-hint">{refreshNote}</p>}
        </div>
      )}

      {ready && data && hasData && (
        <div className={state.status === 'loading' ? 'sf-metrics__body is-loading' : 'sf-metrics__body'}>
          <div className="sf-metrics__tiles">
            <Tile
              label="Seguidores"
              value={formatNumber(data.totals.followers)}
              foot={`${formatSigned(data.totals.followersDelta)} no período`}
              trend={Math.sign(data.totals.followersDelta)}
            />
            <Tile label="Visualizações" value={formatNumber(data.totals.views)} change={percentChange(data.totals.views, data.previous.views)} />
            <Tile label="Alcance" value={formatNumber(data.totals.reach)} change={percentChange(data.totals.reach, data.previous.reach)} />
            <Tile
              label="Interações"
              value={formatNumber(data.totals.totalInteractions)}
              change={percentChange(data.totals.totalInteractions, data.previous.totalInteractions)}
            />
            <Tile
              label="Posts publicados"
              value={formatNumber(data.totals.published)}
              change={percentChange(data.totals.published, data.previous.published)}
            />
          </div>

          <div className="sf-metrics__chart-card">
            <div className="sf-metrics__chart-tabs" role="tablist" aria-label="Métrica do gráfico">
              {CHART_METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={chartMetric === m.key}
                  className={chartMetric === m.key ? 'is-active' : ''}
                  onClick={() => setChartMetric(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <LineChart
              series={data.series}
              metric={chartMetric}
              label={CHART_METRICS.find((m) => m.key === chartMetric).label}
            />
          </div>

          <Ranking
            data={data}
            tab={data.scope === 'all' && data.folders.length > 0 ? rankTab : 'accounts'}
            onTab={setRankTab}
            sort={sort}
            onSort={setSort}
            showAll={showAll}
            onShowAll={() => setShowAll(true)}
            onPick={(scope, id) => setView((v) => ({ ...v, scope, id }))}
          />

          {data.coverage.noInsights.length > 0 && (
            <div className="sf-metrics__notice sf-metrics__notice--warn">
              <p>
                <strong>{data.coverage.noInsights.length} perfil(is) sem permissão de métricas</strong> (
                {data.coverage.noInsights
                  .slice(0, 5)
                  .map((a) => `@${a.username}`)
                  .join(', ')}
                {data.coverage.noInsights.length > 5 ? '...' : ''}): só os seguidores são contados. Reconecte esses perfis
                para liberar visualizações e alcance.
              </p>
              <Link className="sf-button sf-button--secondary sf-button--small" to="/accounts">
                Ir para Contas
              </Link>
            </div>
          )}

          <div className="sf-metrics__foot">
            <span className="sf-field-hint">
              {data.lastCollectedAt ? `Última coleta: ${formatDateTime(data.lastCollectedAt)}` : ''}
              {data.coverage.withData < data.coverage.accounts
                ? ` · ${data.coverage.accounts - data.coverage.withData} perfil(is) ainda sem dados no período`
                : ''}
            </span>
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={refresh} disabled={refreshing}>
              {refreshing ? 'Pedindo...' : 'Atualizar agora'}
            </button>
          </div>
          {refreshNote && <p className="sf-field-hint">{refreshNote}</p>}
        </div>
      )}
    </section>
  );
}

function Tile({ label, value, change = null, foot = null, trend = 0 }) {
  let footer = foot;
  let tone = trend > 0 ? 'up' : trend < 0 ? 'down' : '';
  if (change != null) {
    footer = `${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change)}% vs período anterior`.trim();
    tone = change > 0 ? 'up' : change < 0 ? 'down' : '';
  }
  return (
    <div className="sf-metrics__tile">
      <span className="sf-metrics__tile-label">{label}</span>
      <span className="sf-metrics__tile-value">{value}</span>
      {footer && <span className={`sf-metrics__tile-foot${tone ? ` is-${tone}` : ''}`}>{footer}</span>}
    </div>
  );
}

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

function formatAxis(value) {
  return Math.abs(value) >= 10000 ? nfCompact.format(value) : nf.format(Math.round(value));
}

// Single-series line + area chart with a hover crosshair.
function LineChart({ series, metric, label }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  const height = 220;
  const pad = { top: 14, right: 12, bottom: 26, left: 48 };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(
    () =>
      series.map((p) => ({
        date: p.date,
        value: metric === 'followers' ? p.followers : p.hasData ? p[metric] : null,
      })),
    [series, metric]
  );
  const values = points.map((p) => p.value).filter((v) => v != null);

  if (values.length === 0) {
    return <p className="sf-field-hint sf-metrics__chart-empty">Sem dados de {label.toLowerCase()} neste período.</p>;
  }

  let min = metric === 'followers' ? Math.min(...values) : 0;
  let max = Math.max(...values);
  if (metric === 'followers') {
    const span = Math.max(1, max - min);
    min = Math.max(0, Math.floor(min - span * 0.15));
    max = Math.ceil(max + span * 0.15);
  }
  if (max === min) max = min + 1;
  // Round the axis to clean steps (1/2/5 × 10^n).
  const step = niceStep((max - min) / 3);
  min = Math.floor(min / step) * step;
  max = Math.max(min + step, Math.ceil(max / step) * step);

  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.top + ih - ((v - min) / (max - min)) * ih;

  // Path with gaps on missing days.
  let line = '';
  let area = '';
  let segStart = null;
  points.forEach((p, i) => {
    if (p.value == null) {
      if (segStart != null) area += `L${x(i - 1)},${y(min)}L${x(segStart)},${y(min)}Z`;
      segStart = null;
      return;
    }
    if (segStart == null) {
      line += `M${x(i)},${y(p.value)}`;
      area += `M${x(i)},${y(p.value)}`;
      segStart = i;
    } else {
      line += `L${x(i)},${y(p.value)}`;
      area += `L${x(i)},${y(p.value)}`;
    }
  });
  if (segStart != null) area += `L${x(points.length - 1)},${y(min)}L${x(segStart)},${y(min)}Z`;

  const ticks = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(t);
  const xLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
    const i = Math.round(((px - pad.left) / Math.max(1, iw)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const hp = hover != null ? points[hover] : null;

  return (
    <div className="sf-metrics__chart" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${label} por dia`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="sf-metrics__grid" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="sf-metrics__axis">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="sf-metrics__axis"
          >
            {shortDate(points[i].date)}
          </text>
        ))}
        <path d={area} className="sf-metrics__area" />
        <path d={line} className="sf-metrics__line" />
        {hp && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + ih} className="sf-metrics__crosshair" />
            {hp.value != null && <circle cx={x(hover)} cy={y(hp.value)} r="4.5" className="sf-metrics__dot" />}
          </g>
        )}
        <rect x={pad.left} y={pad.top} width={iw} height={ih} fill="transparent" />
      </svg>
      {hp && (
        <div
          className="sf-metrics__tooltip"
          style={{ left: `${(x(hover) / width) * 100}%`, transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})` }}
        >
          <span>{shortDate(hp.date)}</span>
          <strong>{hp.value == null ? 'sem dados' : formatNumber(hp.value)}</strong>
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}

function Ranking({ data, tab, onTab, sort, onSort, showAll, onShowAll, onPick }) {
  const rows =
    tab === 'folders'
      ? data.folders.map((f) => ({ key: f.folder.id, name: f.folder.name, sub: `${f.accounts} perfil(is)`, pick: ['folder', f.folder.id], ...f }))
      : data.ranking.map((r) => ({
          key: r.account.id,
          name: `@${r.account.username}`,
          sub: r.account.status !== 'ACTIVE' ? 'com problema' : null,
          avatar: r.account.profilePictureUrl,
          pick: ['account', r.account.id],
          ...r,
        }));
  const sorted = [...rows].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));
  const visible = showAll ? sorted : sorted.slice(0, RANK_PREVIEW);
  const single = data.scope === 'account';

  if (single) return null;

  return (
    <div className="sf-metrics__rank">
      <div className="sf-metrics__rank-head">
        <h3>Ranking</h3>
        {data.scope === 'all' && data.folders.length > 0 && (
          <div className="sf-metrics__segmented" role="group" aria-label="Ranking por">
            <button type="button" aria-pressed={tab === 'accounts'} className={tab === 'accounts' ? 'is-active' : ''} onClick={() => onTab('accounts')}>
              Perfis
            </button>
            <button type="button" aria-pressed={tab === 'folders'} className={tab === 'folders' ? 'is-active' : ''} onClick={() => onTab('folders')}>
              Pastas
            </button>
          </div>
        )}
      </div>
      <div className="sf-metrics__table-wrap">
        <table className="sf-metrics__table">
          <thead>
            <tr>
              <th scope="col">{tab === 'folders' ? 'Pasta' : 'Perfil'}</th>
              {RANK_COLUMNS.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort === c.key ? 'descending' : 'none'}>
                  <button type="button" className={sort === c.key ? 'is-active' : ''} onClick={() => onSort(c.key)}>
                    {c.label}
                    {sort === c.key ? ' ↓' : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.key}>
                <th scope="row">
                  <button type="button" className="sf-metrics__rank-name" onClick={() => onPick(...r.pick)} title="Ver só este">
                    {tab !== 'folders' &&
                      (r.avatar ? (
                        <img src={r.avatar} alt="" />
                      ) : (
                        <span className="sf-metrics__avatar" aria-hidden="true">
                          {r.name.charAt(1).toUpperCase()}
                        </span>
                      ))}
                    <span>
                      {r.name}
                      {r.sub && <small>{r.sub}</small>}
                    </span>
                  </button>
                </th>
                <td>{formatNumber(r.followers)}</td>
                <td className={r.followersDelta > 0 ? 'is-up' : r.followersDelta < 0 ? 'is-down' : ''}>{formatSigned(r.followersDelta)}</td>
                <td>{formatNumber(r.views)}</td>
                <td>{formatNumber(r.reach)}</td>
                <td>{formatNumber(r.interactions)}</td>
                <td>{formatNumber(r.published)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && sorted.length > RANK_PREVIEW && (
        <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={onShowAll}>
          Ver todos ({sorted.length})
        </button>
      )}
    </div>
  );
}
