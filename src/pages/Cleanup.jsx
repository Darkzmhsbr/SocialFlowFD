import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import AccountFilterSelect from '../components/AccountFilterSelect.jsx';
import AccountFolderFilter from '../components/AccountFolderFilter.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import * as cleanupService from '../services/cleanupService.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/accounts.css';
import '../styles/schedules.css';
import '../styles/batch.css';
import '../styles/cleanup.css';

// Rodada 12: /cleanup — "Limpeza".
//   Nova limpeza  : choose action + scope, preview, start (runs in background)
//   Em andamento  : progress of running/queued cleanups, cancel
//   Relatórios    : history with results, skip reasons, CSV
//   Automática    : daily rules (free storage of old published posts,
//                   archive old failed posts)

const ACTIONS = [
  {
    key: 'FREE_STORAGE',
    title: 'Liberar armazenamento',
    desc: 'Apaga do armazenamento os vídeos/imagens de posts JÁ PUBLICADOS. O post, o histórico e as métricas continuam aqui. Mídias da Biblioteca nunca são apagadas.',
    done: 'com arquivos liberados',
  },
  {
    key: 'ARCHIVE_POSTS',
    title: 'Arquivar posts',
    desc: 'Move os posts para "Arquivados". Nada é apagado — dá para consultar depois.',
    done: 'arquivado(s)',
  },
  {
    key: 'DELETE_POSTS',
    title: 'Excluir posts',
    desc: 'Remove os posts do SocialFlow e apaga os arquivos que ficarem sem uso. Posts já publicados continuam no Instagram (a API oficial não apaga posts do perfil).',
    done: 'excluído(s)',
  },
];
const ACTION_BY_KEY = Object.fromEntries(ACTIONS.map((a) => [a.key, a]));

const STATUS_OPTIONS = [
  { value: '', label: 'Todos (exceto na fila/publicando)' },
  { value: 'SCHEDULED', label: 'Agendados' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'FAILED', label: 'Falharam' },
  { value: 'PUBLISHED', label: 'Publicados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

const AGE_OPTIONS = [
  { value: '', label: 'Qualquer data' },
  { value: '1', label: 'Mais de 1 dia' },
  { value: '7', label: 'Mais de 7 dias' },
  { value: '15', label: 'Mais de 15 dias' },
  { value: '30', label: 'Mais de 30 dias' },
  { value: '60', label: 'Mais de 60 dias' },
  { value: '90', label: 'Mais de 90 dias' },
];

const JOB_STATUS = {
  QUEUED: { label: 'Na fila', tone: 'warning' },
  RUNNING: { label: 'Em andamento', tone: 'warning' },
  DONE: { label: 'Concluída', tone: 'success' },
  FAILED: { label: 'Falhou', tone: 'error' },
  CANCELED: { label: 'Cancelada', tone: 'error' },
};

const TABS = [
  { key: 'new', label: 'Nova limpeza' },
  { key: 'active', label: 'Em andamento' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'auto', label: 'Automática' },
];

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

function describeFilter(filter = {}) {
  const parts = [];
  if (filter.status) parts.push(STATUS_LABEL[filter.status] || filter.status);
  if (filter.olderThanDays) parts.push(`há mais de ${filter.olderThanDays} dia(s)`);
  if (filter.accountId) parts.push('1 perfil');
  if (filter.folderId) parts.push('1 pasta');
  if (filter.batchId) parts.push('1 lote');
  if (filter.types?.length) parts.push(filter.types.join(', '));
  return parts.length ? parts.join(' · ') : 'todos os posts';
}

function toCsv(jobs) {
  const head = ['data', 'tipo', 'acao', 'status', 'filtro', 'encontrados', 'processados', 'afetados', 'ignorados', 'arquivos_apagados', 'mb_liberados', 'motivos'];
  const rows = jobs.map((j) => [
    formatDateTime(j.createdAt),
    j.kind === 'AUTO' ? 'automatica' : 'manual',
    ACTION_BY_KEY[j.action]?.title || j.action,
    JOB_STATUS[j.status]?.label || j.status,
    describeFilter(j.filter),
    j.matched,
    j.processed,
    j.affected,
    j.skipped,
    j.mediaDeleted,
    (j.bytesFreed / 1024 ** 2).toFixed(1),
    Object.entries(j.skippedReasons || {}).map(([k, v]) => `${k}: ${v}`).join(' | '),
  ]);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

export default function Cleanup() {
  const [tab, setTab] = useState('new');
  const [jobs, setJobs] = useState([]);
  const [jobsState, setJobsState] = useState('loading');
  const [toast, setToast] = useState(null);

  // ---------- new cleanup ----------
  const [action, setAction] = useState('FREE_STORAGE');
  const [status, setStatus] = useState('');
  const [age, setAge] = useState('7');
  const [accountId, setAccountId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);

  // ---------- automatic ----------
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const { jobs: list } = await cleanupService.listCleanupJobs('all', 100);
      setJobs(list || []);
      setJobsState('success');
    } catch (err) {
      setJobsState('error');
    }
  }, []);

  useEffect(() => {
    loadJobs();
    cleanupService
      .getCleanupSettings()
      .then(({ settings: s }) => setSettings(s))
      .catch(() => setSettings({ freeStorageAfterDays: null, archiveFailedAfterDays: null }));
  }, [loadJobs]);

  const active = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'RUNNING');
  const done = jobs.filter((j) => !(j.status === 'QUEUED' || j.status === 'RUNNING'));

  // Poll while something is running (progress bar + report when it ends).
  const hadActive = useRef(false);
  useEffect(() => {
    if (active.length === 0) {
      if (hadActive.current) {
        hadActive.current = false;
        setToast({ tone: 'success', message: '✓ Limpeza concluída. Veja o resultado em Relatórios.' });
      }
      return undefined;
    }
    hadActive.current = true;
    const t = setInterval(loadJobs, 3000);
    return () => clearInterval(t);
  }, [active.length, loadJobs]);

  // Any change in the form invalidates the preview.
  useEffect(() => {
    setPreview(null);
  }, [action, status, age, accountId, folderId]);

  const filter = () => ({
    status: action === 'FREE_STORAGE' ? undefined : status || undefined,
    olderThanDays: age ? Number(age) : undefined,
    accountId: accountId || undefined,
    folderId: folderId || undefined,
  });

  const runPreview = async () => {
    setBusy('preview');
    try {
      const { preview: p } = await cleanupService.previewCleanup({ action, filter: filter() });
      setPreview(p);
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const start = async () => {
    const a = ACTION_BY_KEY[action];
    const msg =
      action === 'DELETE_POSTS'
        ? `Excluir ${preview.matched} post(s) do SocialFlow?\n\nOs já publicados continuam no Instagram. Essa ação não pode ser desfeita.`
        : action === 'FREE_STORAGE'
        ? `Apagar do armazenamento os arquivos de ${preview.matched} post(s) publicado(s)?\n\nOs posts e as métricas continuam aqui, mas os vídeos não poderão mais ser vistos/reutilizados pelo SocialFlow.`
        : `${a.title}: ${preview.matched} post(s)?`;
    if (!window.confirm(msg)) return;
    setBusy('start');
    try {
      await cleanupService.startCleanup({ action, filter: filter() });
      setToast({ tone: 'success', message: '✓ Limpeza iniciada. Acompanhe em "Em andamento" — pode sair desta página.' });
      setPreview(null);
      await loadJobs();
      setTab('active');
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (job) => {
    if (!window.confirm('Cancelar esta limpeza? O que já foi processado não é desfeito.')) return;
    try {
      await cleanupService.cancelCleanup(job.id);
      loadJobs();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([`﻿${toCsv(done)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorios-limpeza-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { settings: s } = await cleanupService.saveCleanupSettings({
        freeStorageAfterDays: settings.freeStorageAfterDays || null,
        archiveFailedAfterDays: settings.archiveFailedAfterDays || null,
      });
      setSettings(s);
      setToast({ tone: 'success', message: '✓ Regras automáticas salvas. Rodam uma vez por dia.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const totalFreed = done.reduce((s, j) => s + (j.bytesFreed || 0), 0);

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Limpeza</h1>
            <p className="sf-page-head__subtitle">
              Exclua, arquive ou libere armazenamento em massa — em segundo plano, com relatório de tudo.
            </p>
          </div>
          {totalFreed > 0 && (
            <div className="sf-clean-freed">
              <span>{formatBytes(totalFreed)}</span>
              <small>liberados no total</small>
            </div>
          )}
        </div>

        <div className="sf-clean-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`sf-clean-tab${tab === t.key ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'active' && active.length > 0 && <span className="sf-clean-tab__badge">{active.length}</span>}
              {t.key === 'reports' && done.length > 0 && <span className="sf-clean-tab__count">({done.length})</span>}
            </button>
          ))}
        </div>

        {/* ---------------- Nova limpeza ---------------- */}
        {tab === 'new' && (
          <div className="sf-clean-new">
            <div className="sf-clean-actions" role="radiogroup" aria-label="Tipo de limpeza">
              {ACTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="radio"
                  aria-checked={action === a.key}
                  className={`sf-clean-action${action === a.key ? ' is-active' : ''}${a.key === 'DELETE_POSTS' ? ' is-danger' : ''}`}
                  onClick={() => setAction(a.key)}
                >
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                </button>
              ))}
            </div>

            <div className="sf-sched-filters">
              <div className="sf-sched-filters__row">
                {action !== 'FREE_STORAGE' && (
                  <label className="sf-posts-filter">
                    <span className="sf-field-label">Status</span>
                    <select className="sf-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.filter((s) => !(action === 'ARCHIVE_POSTS' && s.value === 'ARCHIVED')).map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="sf-posts-filter">
                  <span className="sf-field-label">{action === 'FREE_STORAGE' ? 'Publicados há' : 'Criados há'}</span>
                  <select className="sf-select" value={age} onChange={(e) => setAge(e.target.value)}>
                    {AGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <AccountFolderFilter value={folderId} onChange={setFolderId} />
                <AccountFilterSelect value={accountId} onChange={setAccountId} />
              </div>
            </div>

            {!preview ? (
              <button type="button" className="sf-button sf-button--primary" onClick={runPreview} disabled={busy !== null}>
                {busy === 'preview' ? 'Calculando...' : 'Pré-visualizar'}
              </button>
            ) : (
              <div className={`sf-clean-preview${preview.matched === 0 ? ' is-empty' : ''}`}>
                {preview.matched === 0 ? (
                  <p>Nenhum post encontrado com esses filtros.</p>
                ) : (
                  <>
                    <p className="sf-clean-preview__main">
                      <strong>{preview.matched}</strong> post(s) serão {ACTION_BY_KEY[action].done}
                      {action !== 'ARCHIVE_POSTS' && preview.estimatedFiles > 0 && (
                        <>
                          {' '}· até <strong>{preview.estimatedFiles}</strong> arquivo(s), cerca de{' '}
                          <strong>{formatBytes(preview.estimatedBytes)}</strong>
                        </>
                      )}
                    </p>
                    {preview.inFlightSkipped > 0 && (
                      <p className="sf-field-hint">{preview.inFlightSkipped} post(s) na fila/publicando serão ignorados.</p>
                    )}
                    {preview.overLimit && (
                      <p className="sf-field-hint">Mais de 20.000 posts: esta limpeza processa os primeiros 20.000.</p>
                    )}
                  </>
                )}
                <div className="sf-clean-preview__actions">
                  <button type="button" className="sf-button sf-button--secondary" onClick={() => setPreview(null)}>
                    Alterar filtros
                  </button>
                  {preview.matched > 0 && (
                    <button
                      type="button"
                      className={`sf-button ${action === 'DELETE_POSTS' ? 'sf-button--danger' : 'sf-button--primary'}`}
                      onClick={start}
                      disabled={busy !== null}
                    >
                      {busy === 'start' ? 'Iniciando...' : 'Iniciar limpeza'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Em andamento ---------------- */}
        {tab === 'active' && (
          <>
            {jobsState === 'loading' && <LoadingState message="Carregando..." />}
            {jobsState === 'error' && <ErrorState message="Erro ao carregar as limpezas." onRetry={loadJobs} />}
            {jobsState === 'success' && active.length === 0 && (
              <div className="sf-sched-empty">
                <p className="sf-sched-empty__title">Nenhuma limpeza em andamento.</p>
                <button type="button" className="sf-button sf-button--primary" onClick={() => setTab('new')}>
                  Nova limpeza
                </button>
              </div>
            )}
            {active.map((job) => {
              const pct = job.matched ? Math.min(100, Math.round((job.processed / job.matched) * 100)) : 0;
              return (
                <article key={job.id} className="sf-clean-job">
                  <div className="sf-clean-job__head">
                    <strong>
                      {ACTION_BY_KEY[job.action]?.title}
                      {job.kind === 'AUTO' ? ' (automática)' : ''}
                    </strong>
                    <span className={`sf-pill sf-pill--${JOB_STATUS[job.status].tone}`}>
                      {job.cancelRequested ? 'Cancelando...' : JOB_STATUS[job.status].label}
                    </span>
                  </div>
                  <p className="sf-field-hint">{describeFilter(job.filter)}</p>
                  <div className="sf-batch-uploader__bar">
                    <div className="sf-batch-uploader__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="sf-clean-job__progress">
                    {job.processed} de {job.matched} ({pct}%) · {job.affected} {ACTION_BY_KEY[job.action]?.done}
                    {job.mediaDeleted ? ` · ${formatBytes(job.bytesFreed)} liberados` : ''}
                  </p>
                  {!job.cancelRequested && (
                    <button type="button" className="sf-button sf-button--danger sf-button--small" onClick={() => cancel(job)}>
                      Cancelar
                    </button>
                  )}
                </article>
              );
            })}
          </>
        )}

        {/* ---------------- Relatórios ---------------- */}
        {tab === 'reports' && (
          <>
            {done.length > 0 && (
              <div className="sf-clean-reports-bar">
                <span className="sf-field-hint">Os relatórios ficam guardados — não somem.</span>
                <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={downloadCsv}>
                  Baixar CSV
                </button>
              </div>
            )}
            {jobsState === 'success' && done.length === 0 && (
              <div className="sf-sched-empty">
                <p className="sf-sched-empty__title">Nenhum relatório ainda.</p>
                <p className="sf-field-hint">Os relatórios aparecem aqui quando uma limpeza termina.</p>
              </div>
            )}
            {done.map((job) => (
              <article key={job.id} className="sf-clean-job">
                <div className="sf-clean-job__head">
                  <strong>
                    {ACTION_BY_KEY[job.action]?.title}
                    {job.kind === 'AUTO' ? ' (automática)' : ''}
                  </strong>
                  <span className={`sf-pill sf-pill--${JOB_STATUS[job.status]?.tone || 'warning'}`}>
                    {JOB_STATUS[job.status]?.label || job.status}
                  </span>
                </div>
                <p className="sf-field-hint">
                  {formatDateTime(job.finishedAt || job.createdAt)} · {describeFilter(job.filter)}
                </p>
                <div className="sf-clean-stats">
                  <Stat value={job.affected} label={ACTION_BY_KEY[job.action]?.done || 'afetados'} />
                  {job.action !== 'ARCHIVE_POSTS' && <Stat value={job.mediaDeleted} label="arquivos apagados" />}
                  {job.action !== 'ARCHIVE_POSTS' && <Stat value={formatBytes(job.bytesFreed)} label="liberados" />}
                  <Stat value={job.skipped} label="ignorados" />
                </div>
                {Object.keys(job.skippedReasons || {}).length > 0 && (
                  <ul className="sf-clean-reasons">
                    {Object.entries(job.skippedReasons).map(([reason, count]) => (
                      <li key={reason}>
                        {count} — {reason}
                      </li>
                    ))}
                  </ul>
                )}
                {job.errorMessage && <p className="sf-field-hint sf-field-hint--error">{job.errorMessage}</p>}
              </article>
            ))}
          </>
        )}

        {/* ---------------- Automática ---------------- */}
        {tab === 'auto' && settings && (
          <div className="sf-clean-auto">
            <p className="sf-field-hint">
              As regras rodam sozinhas uma vez por dia e geram um relatório em “Relatórios”. Deixe “Desligado” para não
              usar.
            </p>
            <label className="sf-clean-auto__rule">
              <span>
                <strong>Liberar armazenamento</strong> de posts publicados há mais de
              </span>
              <select
                className="sf-select"
                value={settings.freeStorageAfterDays || ''}
                onChange={(e) => setSettings((s) => ({ ...s, freeStorageAfterDays: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Desligado</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
            <label className="sf-clean-auto__rule">
              <span>
                <strong>Arquivar</strong> posts que falharam há mais de
              </span>
              <select
                className="sf-select"
                value={settings.archiveFailedAfterDays || ''}
                onChange={(e) => setSettings((s) => ({ ...s, archiveFailedAfterDays: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Desligado</option>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
            {settings.lastAutoRunAt && (
              <p className="sf-field-hint">Última execução automática: {formatDateTime(settings.lastAutoRunAt)}</p>
            )}
            <button type="button" className="sf-button sf-button--primary" onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? 'Salvando...' : 'Salvar regras'}
            </button>
          </div>
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="sf-clean-stat">
      <span className="sf-clean-stat__value">{value}</span>
      <span className="sf-clean-stat__label">{label}</span>
    </div>
  );
}
