import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import AccountFilterSelect from '../components/AccountFilterSelect.jsx';
import AccountFolderFilter from '../components/AccountFolderFilter.jsx';
import { ErrorState } from '../components/states.jsx';
import * as postsService from '../services/postsService.js';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import '../styles/schedules.css';
import '../styles/calendar.css';

// Rodada 15: /calendar — "Calendário".
//   Mês    : one cell per day with counters (posts · perfis, mix of types,
//            published/failed) — readable even with hundreds of posts a day.
//   Semana : 7 columns with the first posts of each day.
//   Dia    : side panel with every post of the day (paged), move one post,
//            or move the whole day N days.
//   Arrastar um post (agendado ou com falha) para outro dia mantém o horário.

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const TYPE_ORDER = ['REEL', 'FEED_VIDEO', 'FEED_IMAGE', 'FEED_CAROUSEL', 'STORY'];
const SHOW_OPTIONS = [
  { value: 'all', label: 'Agendados e publicados', statuses: undefined },
  { value: 'scheduled', label: 'Só agendados', statuses: ['SCHEDULED', 'QUEUED', 'PUBLISHING'] },
  { value: 'published', label: 'Só publicados', statuses: ['PUBLISHED'] },
  { value: 'failed', label: 'Só com falha', statuses: ['FAILED'] },
];
const MOVABLE = new Set(['SCHEDULED', 'FAILED']);
const WEEK_PREVIEW = 30;
const DAY_PAGE = 50;
const VIEW_KEY = 'sf_calendar_view';

// ---------- local-date helpers (browser time zone) ----------
export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay());
}

export function rangeFor(view, anchor) {
  if (view === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: startOfWeek(first), end: addDays(startOfWeek(last), 6) };
}

function daysBetween(start, end) {
  const out = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}

function timeOf(value) {
  if (!value) return '--:--';
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function shortDay(key) {
  const d = parseYmd(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Same time of day, other date. Returns null when it would be in the past.
export function moveTarget(post, dayKey, now = Date.now()) {
  const orig = new Date(post.scheduledFor);
  const t = parseYmd(dayKey);
  t.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
  if (t.getTime() < now + 60 * 1000) return null;
  return t;
}

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'month';
  } catch {
    return 'month';
  }
}

export default function Calendar() {
  const [view, setView] = useState(readView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [folderId, setFolderId] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [type, setType] = useState('');
  const [show, setShow] = useState('all');
  const [summary, setSummary] = useState({ status: 'loading', days: {}, totals: null, truncated: false, error: null });
  const [selectedDay, setSelectedDay] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dragOver, setDragOver] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  const { start, end } = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const days = useMemo(() => daysBetween(start, end), [start, end]);
  const todayKey = ymd(new Date());

  const filters = useMemo(
    () => ({
      folderId: folderId || undefined,
      accountId: accountId || undefined,
      types: type ? [type] : undefined,
      statuses: SHOW_OPTIONS.find((o) => o.value === show).statuses,
    }),
    [folderId, accountId, type, show]
  );

  const load = useCallback(async () => {
    setSummary((s) => ({ ...s, status: s.totals ? 'refreshing' : 'loading', error: null }));
    try {
      const { calendar } = await postsService.getCalendar({ ...filters, from: ymd(start), to: ymd(end) });
      setSummary({
        status: 'success',
        days: Object.fromEntries((calendar.days || []).map((d) => [d.date, d])),
        totals: calendar.totals,
        truncated: calendar.truncated,
        error: null,
      });
    } catch (err) {
      setSummary({ status: 'error', days: {}, totals: null, truncated: false, error: err.message });
    }
  }, [filters, start, end]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const refreshAll = () => setReloadKey((k) => k + 1);

  const go = (dir) => {
    if (dir === 0) return setAnchor(new Date());
    if (view === 'week') return setAnchor((a) => addDays(a, 7 * dir));
    return setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  };

  const title =
    view === 'week'
      ? `${shortDay(ymd(start))} a ${shortDay(ymd(end))} de ${end.getFullYear()}`
      : `${MONTHS[anchor.getMonth()].charAt(0).toUpperCase()}${MONTHS[anchor.getMonth()].slice(1)} de ${anchor.getFullYear()}`;

  const movePost = async (post, dayKey) => {
    if (!MOVABLE.has(post.status) || !post.scheduledFor) {
      setToast({ tone: 'error', message: 'Só posts agendados ou com falha podem ser movidos.' });
      return false;
    }
    if (ymd(new Date(post.scheduledFor)) === dayKey) return false;
    const target = moveTarget(post, dayKey);
    if (!target) {
      setToast({ tone: 'error', message: 'Não dá para mover para um horário que já passou.' });
      return false;
    }
    try {
      await postsService.updatePost(post.id, { scheduledFor: target.toISOString() });
      setToast({
        tone: 'success',
        message: `✓ @${post.instagramAccount?.username || 'post'} movido para ${shortDay(dayKey)} às ${timeOf(target)}.`,
      });
      refreshAll();
      return true;
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
      return false;
    }
  };

  // ---------- drag & drop ----------
  const dropProps = (dayKey) => ({
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes('application/x-sf-post')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOver !== dayKey) setDragOver(dayKey);
    },
    onDragLeave: () => setDragOver((d) => (d === dayKey ? null : d)),
    onDrop: (e) => {
      e.preventDefault();
      setDragOver(null);
      try {
        const post = JSON.parse(e.dataTransfer.getData('application/x-sf-post'));
        movePost(post, dayKey);
      } catch {
        // not a post
      }
    },
  });

  const totals = summary.totals;

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main sf-cal-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Calendário</h1>
            <p className="sf-page-head__subtitle">
              A operação inteira por dia. Arraste um post agendado para outro dia para reagendar (o horário é mantido).
            </p>
          </div>
          <div className="sf-page-head__actions">
            <Link className="sf-button sf-button--secondary" to="/posts">
              Agendamentos
            </Link>
            <Link className="sf-button sf-button--primary" to="/posts/new">
              + Novo post
            </Link>
          </div>
        </div>

        <div className="sf-cal-toolbar">
          <div className="sf-cal-nav">
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => go(-1)} aria-label="Anterior">
              ‹
            </button>
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => go(0)}>
              Hoje
            </button>
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => go(1)} aria-label="Próximo">
              ›
            </button>
            <h2 className="sf-cal-title">{title}</h2>
          </div>
          <div className="sf-cal-segmented" role="group" aria-label="Visualização">
            <button type="button" aria-pressed={view === 'month'} className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}>
              Mês
            </button>
            <button type="button" aria-pressed={view === 'week'} className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>
              Semana
            </button>
          </div>
        </div>

        <div className="sf-sched-filters sf-cal-filters">
          <div className="sf-sched-filters__row">
            <label className="sf-posts-filter">
              <span className="sf-field-label">Mostrar</span>
              <select className="sf-select" value={show} onChange={(e) => setShow(e.target.value)}>
                {SHOW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sf-posts-filter">
              <span className="sf-field-label">Tipo</span>
              <select className="sf-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos os tipos</option>
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {POST_TYPE_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </label>
            <AccountFolderFilter value={folderId} onChange={setFolderId} />
            <AccountFilterSelect value={accountId} onChange={setAccountId} />
          </div>
        </div>

        <div className="sf-cal-legend" aria-label="Legenda">
          {TYPE_ORDER.map((t) => (
            <span key={t}>
              <i className={`sf-cal-swatch sf-cal-type--${t}`} aria-hidden="true" />
              {POST_TYPE_LABELS[t] || t}
            </span>
          ))}
          {totals && (
            <strong className="sf-cal-legend__total">
              {totals.total} post(s) · {totals.accounts} perfil(is) no período
            </strong>
          )}
        </div>

        {summary.truncated && (
          <p className="sf-field-hint">Período com posts demais: os números podem estar incompletos. Use os filtros para reduzir.</p>
        )}
        {summary.status === 'error' && <ErrorState message={summary.error} onRetry={load} />}

        {summary.status !== 'error' && view === 'month' && (
          <div className={`sf-cal-month${summary.status === 'loading' ? ' is-loading' : ''}`} role="grid" aria-label="Calendário do mês">
            {WEEKDAYS.map((w) => (
              <div key={w} className="sf-cal-month__weekday" role="columnheader">
                {w}
              </div>
            ))}
            {days.map((d) => {
              const key = ymd(d);
              return (
                <MonthCell
                  key={key}
                  dayKey={key}
                  date={d}
                  info={summary.days[key]}
                  outside={d.getMonth() !== anchor.getMonth()}
                  isToday={key === todayKey}
                  isPast={key < todayKey}
                  isDragOver={dragOver === key}
                  isSelected={selectedDay === key}
                  onOpen={() => setSelectedDay(key)}
                  dropProps={dropProps(key)}
                />
              );
            })}
          </div>
        )}

        {summary.status !== 'error' && view === 'week' && (
          <div className="sf-cal-week">
            {days.map((d) => {
              const key = ymd(d);
              return (
                <WeekColumn
                  key={key}
                  dayKey={key}
                  date={d}
                  info={summary.days[key]}
                  filters={filters}
                  reloadKey={reloadKey}
                  isToday={key === todayKey}
                  isPast={key < todayKey}
                  isDragOver={dragOver === key}
                  onOpen={() => setSelectedDay(key)}
                  dropProps={dropProps(key)}
                />
              );
            })}
          </div>
        )}
      </main>

      {selectedDay && (
        <DayPanel
          dayKey={selectedDay}
          info={summary.days[selectedDay]}
          filters={filters}
          reloadKey={reloadKey}
          onClose={() => setSelectedDay(null)}
          onMove={movePost}
          onShifted={(message, tone = 'success') => {
            setToast({ tone, message });
            refreshAll();
          }}
          onError={(message) => setToast({ tone: 'error', message })}
        />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function TypeBar({ byType = {}, total }) {
  if (!total) return null;
  return (
    <span className="sf-cal-typebar" aria-hidden="true">
      {TYPE_ORDER.filter((t) => byType[t]).map((t) => (
        <i key={t} className={`sf-cal-type--${t}`} style={{ flexGrow: byType[t] }} />
      ))}
    </span>
  );
}

function MonthCell({ dayKey, date, info, outside, isToday, isPast, isDragOver, isSelected, onOpen, dropProps }) {
  const total = info?.total || 0;
  const failed = info?.byStatus?.FAILED || 0;
  const published = info?.byStatus?.PUBLISHED || 0;
  const emptyFuture = !total && !isPast && !outside;
  const label = `${WEEKDAYS_LONG[date.getDay()]}, ${shortDay(dayKey)}: ${total ? `${total} post(s) em ${info.accounts} perfil(is)` : 'sem posts'}`;
  const cls = [
    'sf-cal-cell',
    outside && 'is-outside',
    isToday && 'is-today',
    isPast && 'is-past',
    emptyFuture && 'is-empty',
    isDragOver && 'is-drop',
    isSelected && 'is-selected',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" role="gridcell" className={cls} onClick={onOpen} aria-label={label} {...dropProps}>
      <span className="sf-cal-cell__day">{date.getDate()}</span>
      {total > 0 ? (
        <>
          <span className="sf-cal-cell__count">
            <strong>{total}</strong>
            <span className="sf-cal-cell__long"> post{total === 1 ? '' : 's'}</span>
          </span>
          <span className="sf-cal-cell__accounts">
            {info.accounts} perfi{info.accounts === 1 ? 'l' : 's'}
          </span>
          <TypeBar byType={info.byType} total={total} />
          <span className="sf-cal-cell__flags">
            {published > 0 && <span className="sf-cal-flag sf-cal-flag--ok">✓ {published}</span>}
            {failed > 0 && <span className="sf-cal-flag sf-cal-flag--fail">✕ {failed}</span>}
          </span>
        </>
      ) : (
        emptyFuture && <span className="sf-cal-cell__empty">Sem posts</span>
      )}
    </button>
  );
}

function PostChip({ post, compact = false }) {
  const movable = MOVABLE.has(post.status) && post.scheduledFor;
  const when = post.status === 'PUBLISHED' ? post.publishedAt : post.scheduledFor;
  return (
    <div
      className={`sf-cal-post sf-cal-post--${post.status}${movable ? ' is-movable' : ''}`}
      draggable={Boolean(movable)}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/x-sf-post',
          JSON.stringify({ id: post.id, status: post.status, scheduledFor: post.scheduledFor, instagramAccount: post.instagramAccount })
        );
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={movable ? 'Arraste para outro dia' : undefined}
    >
      <i className={`sf-cal-swatch sf-cal-type--${post.type}`} aria-hidden="true" />
      <span className="sf-cal-post__time">{timeOf(when)}</span>
      <span className="sf-cal-post__user">@{post.instagramAccount?.username}</span>
      {!compact && <span className="sf-cal-post__type">{POST_TYPE_LABELS[post.type] || post.type}</span>}
      {(post.status === 'FAILED' || post.status === 'PUBLISHED' || !compact) && <StatusBadge status={post.status} />}
    </div>
  );
}

function WeekColumn({ dayKey, date, info, filters, reloadKey, isToday, isPast, isDragOver, onOpen, dropProps }) {
  const [state, setState] = useState({ status: 'loading', posts: [], total: 0 });
  const total = info?.total || 0;

  useEffect(() => {
    let alive = true;
    if (!total) {
      setState({ status: 'success', posts: [], total: 0 });
      return undefined;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    postsService
      .queryCalendarPosts({ ...filters, from: dayKey, to: dayKey, take: WEEK_PREVIEW })
      .then(({ posts, total: t }) => alive && setState({ status: 'success', posts: posts || [], total: t || 0 }))
      .catch(() => alive && setState({ status: 'error', posts: [], total: 0 }));
    return () => {
      alive = false;
    };
  }, [dayKey, filters, reloadKey, total]);

  const more = Math.max(0, state.total - state.posts.length);
  return (
    <section
      className={`sf-cal-wcol${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}${isDragOver ? ' is-drop' : ''}${
        !total && !isPast ? ' is-empty' : ''
      }`}
      aria-label={`${WEEKDAYS_LONG[date.getDay()]}, ${shortDay(dayKey)}`}
      {...dropProps}
    >
      <button type="button" className="sf-cal-wcol__head" onClick={onOpen}>
        <span>{WEEKDAYS[date.getDay()]}</span>
        <strong>{date.getDate()}</strong>
        {total > 0 && (
          <small>
            {total} · {info.accounts} perfi{info.accounts === 1 ? 'l' : 's'}
          </small>
        )}
      </button>
      <div className="sf-cal-wcol__list">
        {state.status === 'loading' && total > 0 && <p className="sf-field-hint">Carregando...</p>}
        {state.status === 'error' && <p className="sf-field-hint">Erro ao carregar.</p>}
        {!total && <p className="sf-cal-wcol__empty">{isPast ? '—' : 'Sem posts'}</p>}
        {state.posts.map((p) => (
          <PostChip key={p.id} post={p} compact />
        ))}
        {more > 0 && (
          <button type="button" className="sf-cal-wcol__more" onClick={onOpen}>
            + {more} mais
          </button>
        )}
      </div>
    </section>
  );
}

function DayPanel({ dayKey, info, filters, reloadKey, onClose, onMove, onShifted, onError }) {
  const [state, setState] = useState({ status: 'loading', posts: [], total: 0 });
  const [page, setPage] = useState(1);
  const [movingId, setMovingId] = useState(null);
  const [moveDate, setMoveDate] = useState('');
  const [shiftDays, setShiftDays] = useState(1);
  const [busy, setBusy] = useState(false);
  const date = parseYmd(dayKey);

  useEffect(() => {
    setPage(1);
    setMovingId(null);
  }, [dayKey]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    postsService
      .queryCalendarPosts({ ...filters, from: dayKey, to: dayKey, take: DAY_PAGE * page })
      .then(({ posts, total }) => alive && setState({ status: 'success', posts: posts || [], total: total || 0 }))
      .catch((err) => alive && setState({ status: 'error', posts: [], total: 0, error: err.message }));
    return () => {
      alive = false;
    };
  }, [dayKey, filters, reloadKey, page]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const movableCount = state.posts.filter((p) => MOVABLE.has(p.status)).length;

  const shiftDay = async () => {
    const n = Number(shiftDays);
    if (!Number.isInteger(n) || n === 0) return;
    const target = shortDay(ymd(addDays(date, n)));
    if (
      !window.confirm(
        `Mover os posts agendados/com falha de ${shortDay(dayKey)} para ${target} (${n > 0 ? '+' : ''}${n} dia(s))?\n\nO horário de cada post é mantido. Posts na fila, publicando ou publicados não mudam.`
      )
    )
      return;
    setBusy(true);
    try {
      const { result } = await postsService.shiftPostsDays({ days: n, from: dayKey, to: dayKey, ...filters });
      onShifted(
        result.affected > 0
          ? `✓ ${result.affected} post(s) movido(s) para ${target}${result.inPast ? ` · ${result.inPast} ignorado(s) (horário já passou)` : ''}.`
          : 'Nenhum post pôde ser movido (só agendados/com falha, e nunca para o passado).',
        result.affected > 0 ? 'success' : 'error'
      );
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="sf-cal-panel" aria-label={`Posts de ${shortDay(dayKey)}`}>
      <div className="sf-cal-panel__head">
        <div>
          <h3>
            {WEEKDAYS_LONG[date.getDay()]}, {shortDay(dayKey)}
          </h3>
          <p className="sf-field-hint">
            {info?.total ? `${info.total} post(s) · ${info.accounts} perfil(is)` : 'Nenhum post neste dia'}
          </p>
        </div>
        <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="sf-cal-panel__list">
        {state.status === 'loading' && state.posts.length === 0 && <p className="sf-field-hint">Carregando...</p>}
        {state.status === 'error' && <p className="sf-field-hint sf-field-hint--error">{state.error}</p>}
        {state.status !== 'loading' && state.posts.length === 0 && state.status !== 'error' && (
          <div className="sf-cal-panel__empty">
            <p>Nada programado aqui.</p>
            <Link className="sf-button sf-button--primary sf-button--small" to="/posts/new">
              + Novo post
            </Link>
          </div>
        )}
        {state.posts.map((post) => (
          <div key={post.id} className="sf-cal-panel__row">
            <PostChip post={post} />
            {post.caption && <p className="sf-cal-panel__caption">{post.caption.slice(0, 90)}</p>}
            <div className="sf-cal-panel__actions">
              {MOVABLE.has(post.status) && post.scheduledFor && (
                <button
                  type="button"
                  className="sf-button sf-button--secondary sf-button--small"
                  onClick={() => {
                    setMovingId(movingId === post.id ? null : post.id);
                    setMoveDate(dayKey);
                  }}
                >
                  Mover
                </button>
              )}
              {['DRAFT', 'SCHEDULED', 'FAILED'].includes(post.status) && (
                <Link className="sf-button sf-button--secondary sf-button--small" to={`/posts/${post.id}/edit`}>
                  Editar
                </Link>
              )}
            </div>
            {movingId === post.id && (
              <div className="sf-cal-panel__move">
                <label>
                  <span className="sf-field-label">Novo dia (mesmo horário {timeOf(post.scheduledFor)})</span>
                  <input type="date" className="sf-input" value={moveDate} min={ymd(new Date())} onChange={(e) => setMoveDate(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="sf-button sf-button--primary sf-button--small"
                  disabled={!moveDate || moveDate === dayKey}
                  onClick={async () => {
                    if (await onMove(post, moveDate)) setMovingId(null);
                  }}
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        ))}
        {state.total > state.posts.length && (
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => setPage((p) => p + 1)} disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Carregando...' : `Carregar mais (${state.total - state.posts.length})`}
          </button>
        )}
      </div>

      {movableCount > 0 && (
        <div className="sf-cal-panel__shift">
          <span className="sf-field-label">Mover o dia inteiro (agendados e com falha)</span>
          <div className="sf-cal-panel__shift-row">
            <select className="sf-select" value={shiftDays} onChange={(e) => setShiftDays(Number(e.target.value))} aria-label="Dias">
              {[-7, -3, -2, -1, 1, 2, 3, 7, 14].map((n) => (
                <option key={n} value={n}>
                  {n > 0 ? `+${n}` : n} dia{Math.abs(n) === 1 ? '' : 's'} ({shortDay(ymd(addDays(date, n)))})
                </option>
              ))}
            </select>
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={shiftDay} disabled={busy}>
              {busy ? 'Movendo...' : 'Mover dia'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}