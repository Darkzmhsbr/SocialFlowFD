import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import PostCard from '../components/PostCard.jsx';
import BatchStrip from '../components/BatchStrip.jsx';
import BatchActionsModal from '../components/BatchActionsModal.jsx';
import AccountFilterSelect from '../components/AccountFilterSelect.jsx';
import Pagination from '../components/Pagination.jsx';
import Toast from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { useSchedules } from '../hooks/useSchedules.js';
import * as postsService from '../services/postsService.js';
import { POSTS_PAGE_SIZE } from '../utils/postConstants.js';
import { formatDateTime, formatRelative } from '../utils/formatDate.js';
import '../styles/posts.css';
import '../styles/batch.css';
import '../styles/schedules.css';
// Rodada 8: filter by profile folder (also via /posts?folder=<id>).
import { useSearchParams } from 'react-router-dom';
import AccountFolderFilter from '../components/AccountFolderFilter.jsx';

// Rodada 6: Agendamentos — replaces the old /posts list (still at
// /posts/classic). Search by caption/@profile, status/type/profile filters
// with counters, next publication, auto-refresh, list grouped by day,
// checkboxes + bulk actions (publicar agora / arquivar / excluir), which can
// also target "todos os filtrados" (every page).

const STATUS_FILTERS = [
  { key: null, label: 'Todos' },
  { key: 'SCHEDULED', label: 'Agendados' },
  { key: 'QUEUED', label: 'Na fila' },
  { key: 'PUBLISHING', label: 'Publicando' },
  { key: 'PUBLISHED', label: 'Publicados' },
  { key: 'FAILED', label: 'Falharam' },
  { key: 'DRAFT', label: 'Rascunhos' },
  { key: 'ARCHIVED', label: 'Arquivados' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'Todos', types: null },
  { key: 'reels', label: 'Reels', types: ['REEL'] },
  { key: 'feed', label: 'Feed', types: ['FEED_IMAGE', 'FEED_VIDEO'] },
  { key: 'carousel', label: 'Carrossel', types: ['FEED_CAROUSEL'] },
  { key: 'story', label: 'Stories', types: ['STORY'] },
];

const AUTO_REFRESH_MS = 30 * 1000;
const AUTO_REFRESH_KEY = 'sf_schedules_autorefresh';

function readAutoRefresh() {
  try {
    return localStorage.getItem(AUTO_REFRESH_KEY) !== '0';
  } catch {
    return true;
  }
}

function postDate(post) {
  return post.scheduledFor || post.publishedAt || post.createdAt || null;
}

function dayKey(iso) {
  if (!iso) return 'none';
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso) {
  if (!iso) return 'Sem data';
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Schedules() {
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeKey, setTypeKey] = useState('all');
  const [accountId, setAccountId] = useState(null);
  // Rodada 8
  const [searchParams] = useSearchParams();
  const [folderId, setFolderId] = useState(() => searchParams.get('folder') || null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(readAutoRefresh);
  const [selected, setSelected] = useState(() => new Set());
  const [allFiltered, setAllFiltered] = useState(false);
  const [bulkInterval, setBulkInterval] = useState(30);
  const [bulkBusy, setBulkBusy] = useState(null);
  const [openBatchId, setOpenBatchId] = useState(null);
  const [toast, setToast] = useState(null);

  const types = TYPE_FILTERS.find((t) => t.key === typeKey)?.types || null;

  // Search waits for the user to stop typing.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { loadState, posts, total, overview, error, lastUpdated, refresh } = useSchedules({
    status: statusFilter,
    types,
    accountId,
    q,
    folderId,
    page,
    pageSize: POSTS_PAGE_SIZE,
  });

  // Any filter change: back to page 1, clear selection.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, typeKey, accountId, q, folderId]);

  useEffect(() => {
    setSelected(new Set());
    setAllFiltered(false);
  }, [statusFilter, typeKey, accountId, q, folderId, page]);

  // Emptied the last page (delete/archive): step back.
  useEffect(() => {
    if (loadState === 'success' && posts.length === 0 && page > 0) setPage((p) => Math.max(0, p - 1));
  }, [loadState, posts.length, page]);

  // Auto-refresh while the tab is visible.
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_REFRESH_KEY, next ? '1' : '0');
      } catch {
        // not remembered
      }
      return next;
    });
  };

  const byStatus = overview?.byStatus || {};
  const byType = overview?.byType || {};
  const statusTotal = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const typeCount = (t) =>
    t.types ? t.types.reduce((sum, ty) => sum + (byType[ty] || 0), 0) : Object.values(byType).reduce((a, b) => a + b, 0);

  const groups = useMemo(() => {
    const out = [];
    for (const post of posts) {
      const iso = postDate(post);
      const key = dayKey(iso);
      const last = out[out.length - 1];
      if (last && last.key === key) last.posts.push(post);
      else out.push({ key, label: dayLabel(iso), posts: [post] });
    }
    return out;
  }, [posts]);

  // ---------- single-post actions (same as the classic list) ----------
  const afterAction = useCallback(
    (message, tone = 'success') => {
      setToast({ tone, message });
      refresh({ silent: true });
    },
    [refresh]
  );

  const handleArchive = async (id) => {
    try {
      await postsService.archivePost(id);
      afterAction('✓ Post arquivado.');
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await postsService.deletePost(id);
      afterAction('✓ Post excluído.');
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handlePublishNow = async (id) => {
    try {
      const res = await postsService.publishPostNow(id);
      afterAction(`✓ ${res?.notice || 'Post na fila de publicação.'}`);
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  // ---------- selection + bulk ----------
  const pageIds = posts.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectionCount = allFiltered ? total : selected.size;

  const toggleOne = (id) => {
    setAllFiltered(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setAllFiltered(false);
    setSelected(allPageSelected ? new Set() : new Set(pageIds));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setAllFiltered(false);
  };

  const runBulk = async (action) => {
    const count = selectionCount;
    const messages = {
      'publish-now': `Publicar agora ${count} post(s)? Só saem os agendados, rascunhos e com falha de perfis ativos${
        bulkInterval > 0 ? `, com ${bulkInterval} min entre posts do mesmo perfil` : ''
      }.`,
      archive: `Arquivar ${count} post(s)? Posts na fila ou em publicação são ignorados.`,
      delete: `Excluir ${count} post(s)? Posts na fila ou em publicação são ignorados. Os já publicados continuam no Instagram — só o registro sai daqui. Essa ação não pode ser desfeita.`,
    };
    if (!window.confirm(messages[action])) return;

    setBulkBusy(action);
    try {
      const body = { action, intervalMinutes: bulkInterval, windowMinutes: 10 };
      if (allFiltered) body.filter = { status: statusFilter, types, accountId, q, folderId };
      else body.ids = [...selected];
      const { result } = await postsService.bulkPosts(body);
      const verb = { 'publish-now': 'na fila para publicar', archive: 'arquivado(s)', delete: 'excluído(s)' }[action];
      clearSelection();
      afterAction(
        `✓ ${result.affected} post(s) ${verb}${result.skipped ? ` · ${result.skipped} ignorado(s)` : ''}.`
      );
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setBulkBusy(null);
    }
  };

  const next = overview?.nextScheduled;

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Agendamentos</h1>
            <p className="sf-page-head__subtitle">Programe, acompanhe e gerencie suas publicações.</p>
          </div>
          <div className="sf-page-head__actions">
            <Link className="sf-button sf-button--primary" to="/posts/new">
              + Novo post
            </Link>
          </div>
        </div>

        {/* status line */}
        <div className="sf-sched-status">
          <button
            type="button"
            className={`sf-sched-live${autoRefresh ? ' is-on' : ''}`}
            onClick={toggleAutoRefresh}
            title="Atualiza a lista sozinha a cada 30 segundos"
          >
            <span className="sf-sched-live__dot" aria-hidden="true" />
            {autoRefresh ? 'Atualização automática ativa' : 'Atualização automática pausada'}
          </button>
          <span className="sf-sched-next">
            Próxima publicação:{' '}
            <strong>
              {next
                ? `@${next.username} · ${formatDateTime(next.scheduledFor)} (${formatRelative(next.scheduledFor)})`
                : 'nenhuma agendada'}
            </strong>
          </span>
          <button
            type="button"
            className="sf-button sf-button--secondary sf-button--small sf-sched-refresh"
            onClick={() => refresh({ silent: true })}
            title={lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : undefined}
          >
            <Icon name="refresh" size={16} /> Atualizar
          </button>
        </div>

        {/* filters */}
        <div className="sf-sched-filters">
          <div className="sf-sched-filters__row">
            <label className="sf-search sf-sched-filters__search">
              <Icon name="search" size={18} />
              <input
                type="search"
                className="sf-search__input"
                placeholder="Buscar por legenda ou @perfil..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <AccountFolderFilter value={folderId} onChange={setFolderId} />
            <AccountFilterSelect value={accountId} onChange={setAccountId} />
          </div>

          <div className="sf-chips sf-chips--scroll" role="tablist" aria-label="Filtrar por status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                role="tab"
                aria-selected={statusFilter === f.key}
                className={`sf-chip${statusFilter === f.key ? ' is-active' : ''}${
                  f.key === 'FAILED' && byStatus.FAILED ? ' sf-chip--danger' : ''
                }`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label} ({f.key ? byStatus[f.key] || 0 : statusTotal})
              </button>
            ))}
          </div>

          <div className="sf-chips sf-chips--scroll" role="tablist" aria-label="Filtrar por tipo">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={typeKey === t.key}
                className={`sf-chip sf-chip--small${typeKey === t.key ? ' is-active' : ''}`}
                onClick={() => setTypeKey(t.key)}
              >
                {t.label} ({typeCount(t)})
              </button>
            ))}
          </div>
        </div>

        {loadState === 'success' && posts.length > 0 && <BatchStrip posts={posts} onManage={setOpenBatchId} />}

        {/* selection bar */}
        {loadState === 'success' && posts.length > 0 && (
          <div className={`sf-sched-bulk${selectionCount > 0 ? ' is-active' : ''}`}>
            <label className="sf-sched-bulk__check">
              <input type="checkbox" checked={allPageSelected || allFiltered} onChange={togglePage} />
              {selectionCount > 0 ? `${selectionCount} selecionado(s)` : 'Selecionar esta página'}
            </label>

            {allPageSelected && !allFiltered && total > posts.length && (
              <button type="button" className="sf-sched-bulk__link" onClick={() => setAllFiltered(true)}>
                Selecionar todos os {total} filtrados
              </button>
            )}
            {selectionCount > 0 && (
              <button type="button" className="sf-sched-bulk__link" onClick={clearSelection}>
                Limpar seleção
              </button>
            )}

            {selectionCount > 0 && (
              <div className="sf-sched-bulk__actions">
                <select
                  className="sf-select"
                  value={bulkInterval}
                  onChange={(e) => setBulkInterval(Number(e.target.value))}
                  aria-label="Intervalo entre posts do mesmo perfil"
                  disabled={bulkBusy !== null}
                >
                  <option value={0}>Sem intervalo</option>
                  <option value={15}>15 min/perfil</option>
                  <option value={30}>30 min/perfil</option>
                  <option value={60}>1 h/perfil</option>
                </select>
                <button
                  type="button"
                  className="sf-button sf-button--primary sf-button--small"
                  onClick={() => runBulk('publish-now')}
                  disabled={bulkBusy !== null}
                >
                  {bulkBusy === 'publish-now' ? 'Enviando...' : 'Publicar agora'}
                </button>
                <button
                  type="button"
                  className="sf-button sf-button--secondary sf-button--small"
                  onClick={() => runBulk('archive')}
                  disabled={bulkBusy !== null}
                >
                  {bulkBusy === 'archive' ? 'Arquivando...' : 'Arquivar'}
                </button>
                <button
                  type="button"
                  className="sf-button sf-button--danger sf-button--small"
                  onClick={() => runBulk('delete')}
                  disabled={bulkBusy !== null}
                >
                  {bulkBusy === 'delete' ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            )}
          </div>
        )}

        {loadState === 'loading' && <LoadingState message="Carregando agendamentos..." />}
        {loadState === 'error' && <ErrorState message={error} onRetry={() => refresh()} />}

        {loadState === 'success' && posts.length === 0 && (
          <div className="sf-sched-empty">
            <Icon name="calendar" size={36} />
            <p className="sf-sched-empty__title">
              {q || accountId || folderId || statusFilter || typeKey !== 'all' ? 'Nada encontrado com esses filtros.' : 'Nenhum post ainda.'}
            </p>
            <Link className="sf-button sf-button--primary" to="/posts/new">
              Criar agendamento
            </Link>
          </div>
        )}

        {loadState === 'success' &&
          groups.map((group) => (
            <section key={group.key} className="sf-sched-day">
              <h2 className="sf-sched-day__title">
                {group.label} <span className="sf-sched-day__count">{group.posts.length}</span>
              </h2>
              <div className="sf-post-list">
                {group.posts.map((post) => (
                  <div key={post.id} className={`sf-sched-row${selected.has(post.id) || allFiltered ? ' is-selected' : ''}`}>
                    <label className="sf-sched-row__check" aria-label="Selecionar post">
                      <input
                        type="checkbox"
                        checked={allFiltered || selected.has(post.id)}
                        onChange={() => toggleOne(post.id)}
                      />
                    </label>
                    <div className="sf-sched-row__card">
                      <PostCard
                        post={post}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onPublishNow={handlePublishNow}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

        {loadState === 'success' && (
          <Pagination
            page={page}
            pageSize={POSTS_PAGE_SIZE}
            total={total}
            onChange={(n) => {
              setPage(n);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {openBatchId && (
        <BatchActionsModal
          batchId={openBatchId}
          onClose={() => setOpenBatchId(null)}
          onChanged={(message) => afterAction(message)}
        />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}