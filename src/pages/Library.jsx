import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import MediaThumb, { formatBytes } from '../components/MediaThumb.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { useLibraryUploader, LIBRARY_UPLOAD_MAX_FILES } from '../hooks/useLibraryUploader.js';
import * as mediaService from '../services/mediaService.js';
import '../styles/accounts.css';
import '../styles/library.css';

// Rodada 7: /library — folders + uploads kept for reuse. Media here is
// never deleted automatically when a post is deleted. "Envios do editor"
// shows what was uploaded straight in the composer (not kept), with a
// button to keep it.
const PAGE_SIZE = 60;
const TYPE_FILTERS = [
  { key: null, label: 'Todas' },
  { key: 'VIDEO', label: 'Vídeos' },
  { key: 'IMAGE', label: 'Imagens' },
];

export default function Library() {
  const [folders, setFolders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, root: 0, unsaved: 0 });
  const [scope, setScope] = useState({ scope: 'all', folderId: null });
  const [type, setType] = useState(null);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState('loading');
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [moveTarget, setMoveTarget] = useState('');
  const [busy, setBusy] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const seq = useRef(0);

  const loadFolders = useCallback(async () => {
    try {
      const res = await mediaService.listFolders();
      setFolders(res.folders || []);
      setCounts(res.counts || { all: 0, root: 0, unsaved: 0 });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  }, []);

  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      const mySeq = ++seq.current;
      if (!silent) setLoadState('loading');
      try {
        const res = await mediaService.listLibrary({
          scope: scope.scope,
          folderId: scope.folderId,
          type,
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });
        if (mySeq !== seq.current) return;
        setItems(res.media || []);
        setTotal(res.total || 0);
        setLoadState('success');
      } catch (err) {
        if (mySeq !== seq.current) return;
        setError(err.message);
        setLoadState('error');
      }
    },
    [scope, type, page]
  );

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setPage(0);
  }, [scope, type]);

  useEffect(() => {
    setSelected(new Set());
  }, [scope, type, page]);

  const refreshAll = () => {
    loadFolders();
    loadItems({ silent: true });
  };

  // ---------- upload ----------
  const uploadFolderId = scope.scope === 'folder' ? scope.folderId : null;
  const { progress, uploadFiles, busy: uploading } = useLibraryUploader({
    onUploaded: (media) => {
      setItems((prev) => (page === 0 && (!type || media.type === type) && scope.scope !== 'unsaved' ? [media, ...prev] : prev));
    },
    onFinished: ({ sent, problems }) => {
      if (problems.length) setToast({ tone: 'error', message: `${sent} enviado(s). ${problems.join(' ')}` });
      else if (sent) setToast({ tone: 'success', message: `✓ ${sent} mídia(s) salva(s) na biblioteca.` });
      refreshAll();
    },
  });

  const pickFiles = () => {
    if (!uploading) fileRef.current?.click();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) uploadFiles(e.dataTransfer.files, { folderId: uploadFolderId });
  };

  // ---------- folders ----------
  const currentFolder = scope.scope === 'folder' ? folders.find((f) => f.id === scope.folderId) : null;

  const handleNewFolder = async () => {
    const name = window.prompt('Nome da nova pasta (ex.: Memes):');
    if (!name) return;
    try {
      const { folder } = await mediaService.createFolder(name);
      await loadFolders();
      setScope({ scope: 'folder', folderId: folder.id });
      setToast({ tone: 'success', message: `✓ Pasta "${folder.name}" criada.` });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handleRename = async () => {
    if (!currentFolder) return;
    const name = window.prompt('Novo nome da pasta:', currentFolder.name);
    if (!name || name === currentFolder.name) return;
    try {
      await mediaService.renameFolder(currentFolder.id, name);
      await loadFolders();
      setToast({ tone: 'success', message: '✓ Pasta renomeada.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handleDeleteFolder = async () => {
    if (!currentFolder) return;
    if (!window.confirm(`Excluir a pasta "${currentFolder.name}"?`)) return;
    const alsoMedia =
      currentFolder.count > 0 &&
      window.confirm(
        `Também remover as ${currentFolder.count} mídia(s) dela?\n\nOK = remover as mídias junto\nCancelar = manter as mídias na biblioteca, em "Sem pasta"`
      );
    try {
      await mediaService.deleteFolder(currentFolder.id, alsoMedia ? 'delete' : 'keep');
      setScope({ scope: 'all', folderId: null });
      await loadFolders();
      setToast({ tone: 'success', message: '✓ Pasta excluída.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  // ---------- selection + bulk ----------
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && items.every((m) => selected.has(m.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((m) => m.id)));

  const runBulk = async (action) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    let body = { action, ids };
    if (action === 'move') {
      if (moveTarget === '') return;
      body.folderId = moveTarget === '__root' ? null : moveTarget;
    }
    if (
      action === 'remove' &&
      !window.confirm(
        `Remover ${ids.length} mídia(s) da biblioteca?\n\nArquivos que ainda estão em algum post saem da biblioteca, mas só são apagados quando esses posts forem excluídos. Os demais são apagados agora.`
      )
    )
      return;

    setBusy(action);
    try {
      const { result } = await mediaService.libraryBulk(body);
      const msg =
        action === 'remove'
          ? `✓ ${result.deleted} apagada(s)${result.keptInUse ? ` · ${result.keptInUse} em uso mantida(s) fora da biblioteca` : ''}.`
          : action === 'move'
          ? `✓ ${result.updated} mídia(s) movida(s).`
          : `✓ ${result.updated} mídia(s) guardada(s) na biblioteca.`;
      setToast({ tone: 'success', message: msg });
      setSelected(new Set());
      setMoveTarget('');
      refreshAll();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const isActive = (s, id = null) => scope.scope === s && scope.folderId === id;

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Biblioteca</h1>
            <p className="sf-page-head__subtitle">Mídias e pastas para reutilizar em vários perfis.</p>
          </div>
          <div className="sf-page-head__actions">
            <button type="button" className="sf-button sf-button--secondary" onClick={handleNewFolder}>
              <Icon name="folder" size={18} /> Nova pasta
            </button>
            <button type="button" className="sf-button sf-button--primary" onClick={pickFiles} disabled={uploading}>
              {uploading ? 'Enviando...' : '↑ Upload'}
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,video/mp4,video/quicktime"
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = e.target.files;
            uploadFiles(files, { folderId: uploadFolderId });
            e.target.value = '';
          }}
        />

        {/* folders */}
        <div className="sf-lib-folders" role="tablist" aria-label="Pastas">
          <FolderTile label="Todas" count={counts.all} icon="image" active={isActive('all')} onClick={() => setScope({ scope: 'all', folderId: null })} />
          <FolderTile label="Sem pasta" count={counts.root} icon="folder" active={isActive('root')} onClick={() => setScope({ scope: 'root', folderId: null })} />
          {folders.map((f) => (
            <FolderTile
              key={f.id}
              label={f.name}
              count={f.count}
              preview={f.preview}
              icon="folder"
              active={isActive('folder', f.id)}
              onClick={() => setScope({ scope: 'folder', folderId: f.id })}
            />
          ))}
          <FolderTile
            label="Envios do editor"
            hint="não guardados"
            count={counts.unsaved}
            icon="image"
            muted
            active={isActive('unsaved')}
            onClick={() => setScope({ scope: 'unsaved', folderId: null })}
          />
        </div>

        {currentFolder && (
          <div className="sf-lib-folder-bar">
            <strong>
              <Icon name="folder" size={18} /> {currentFolder.name}
            </strong>
            <div className="sf-lib-folder-bar__actions">
              <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={handleRename}>
                Renomear
              </button>
              <button type="button" className="sf-button sf-button--danger sf-button--small" onClick={handleDeleteFolder}>
                Excluir pasta
              </button>
            </div>
          </div>
        )}

        {scope.scope === 'unsaved' && (
          <p className="sf-lib-note">
            Mídias enviadas direto no Novo post. Elas são apagadas sozinhas quando os posts que as usam são excluídos —
            selecione e use “Guardar na biblioteca” para mantê-las.
          </p>
        )}

        {/* dropzone */}
        {scope.scope !== 'unsaved' && (
          <div
            className={`sf-lib-drop${dragOver ? ' is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={pickFiles}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pickFiles()}
          >
            {progress ? (
              <div className="sf-lib-drop__progress" role="status" aria-live="polite">
                <div className="sf-batch-uploader__bar">
                  <div
                    className="sf-batch-uploader__bar-fill"
                    style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
                  />
                </div>
                <span>
                  Enviando {progress.done + 1} de {progress.total}: {progress.name}
                </span>
              </div>
            ) : (
              <>
                <strong>Arraste fotos e vídeos aqui ou clique para escolher</strong>
                <span>
                  Até {LIBRARY_UPLOAD_MAX_FILES} por vez · JPG, PNG, MP4, MOV · vão para{' '}
                  {currentFolder ? `“${currentFolder.name}”` : '“Sem pasta”'}
                </span>
              </>
            )}
          </div>
        )}

        {/* type + selection */}
        <div className="sf-lib-toolbar">
          <div className="sf-chips">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`sf-chip sf-chip--small${type === t.key ? ' is-active' : ''}`}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {items.length > 0 && (
            <label className="sf-lib-toolbar__all">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} /> Selecionar página
            </label>
          )}
        </div>

        {selected.size > 0 && (
          <div className="sf-sched-bulk is-active sf-lib-bulk">
            <strong>{selected.size} selecionada(s)</strong>
            <div className="sf-sched-bulk__actions">
              <select
                className="sf-select"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                aria-label="Mover para a pasta"
                disabled={busy !== null}
              >
                <option value="">Mover para...</option>
                <option value="__root">Sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="sf-button sf-button--secondary sf-button--small"
                onClick={() => runBulk('move')}
                disabled={busy !== null || moveTarget === ''}
              >
                {busy === 'move' ? 'Movendo...' : 'Mover'}
              </button>
              {scope.scope === 'unsaved' && (
                <button
                  type="button"
                  className="sf-button sf-button--primary sf-button--small"
                  onClick={() => runBulk('save')}
                  disabled={busy !== null}
                >
                  {busy === 'save' ? 'Guardando...' : 'Guardar na biblioteca'}
                </button>
              )}
              <button
                type="button"
                className="sf-button sf-button--danger sf-button--small"
                onClick={() => runBulk('remove')}
                disabled={busy !== null}
              >
                {busy === 'remove' ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        )}

        {loadState === 'loading' && <LoadingState message="Carregando mídias..." />}
        {loadState === 'error' && <ErrorState message={error} onRetry={() => loadItems()} />}
        {loadState === 'success' && items.length === 0 && (
          <p className="sf-lib-empty">Nenhuma mídia aqui ainda.</p>
        )}

        {loadState === 'success' && items.length > 0 && (
          <ul className="sf-lib-grid">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`sf-lib-thumb${selected.has(m.id) ? ' is-selected' : ''}`}
                  onClick={() => toggle(m.id)}
                  aria-pressed={selected.has(m.id)}
                >
                  <MediaThumb media={m} />
                  <span className="sf-lib-thumb__check" aria-hidden="true">
                    {selected.has(m.id) ? '✓' : ''}
                  </span>
                  <span className="sf-lib-thumb__meta">
                    {m.type === 'VIDEO' ? '▶ Vídeo' : 'Imagem'} {m.bytes ? `· ${formatBytes(m.bytes)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {loadState === 'success' && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function FolderTile({ label, count, icon, preview, active, onClick, hint, muted }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`sf-lib-folder${active ? ' is-active' : ''}${muted ? ' is-muted' : ''}`}
      onClick={onClick}
    >
      <span className="sf-lib-folder__icon">
        {preview ? <MediaThumb media={preview} /> : <Icon name={icon} size={20} />}
      </span>
      <span className="sf-lib-folder__text">
        <span className="sf-lib-folder__name">{label}</span>
        <span className="sf-lib-folder__count">
          {count} {hint ? `· ${hint}` : count === 1 ? 'mídia' : 'mídias'}
        </span>
      </span>
    </button>
  );
}