import { useCallback, useEffect, useState } from 'react';
import MediaThumb from './MediaThumb.jsx';
import Pagination from './Pagination.jsx';
import * as mediaService from '../services/mediaService.js';
import '../styles/library.css';

// Rodada 7: "Escolher da biblioteca" modal for the composer. Pick media
// from any folder — no new upload, the same files are reused.
//   allowedTypes: ['VIDEO'] for Reels, ['IMAGE','VIDEO'] for carousel...
//   max:          how many can still be added
const PAGE_SIZE = 48;

export default function LibraryPicker({ allowedTypes = ['IMAGE', 'VIDEO'], max = 50, onPick, onClose }) {
  const onlyType = allowedTypes.length === 1 ? allowedTypes[0] : null;
  const [folders, setFolders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, root: 0 });
  const [scopeKey, setScopeKey] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    mediaService
      .listFolders()
      .then((res) => {
        setFolders(res.folders || []);
        setCounts(res.counts || { all: 0, root: 0 });
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const scope = scopeKey === 'all' || scopeKey === 'root' ? scopeKey : 'folder';
      const res = await mediaService.listLibrary({
        scope,
        folderId: scope === 'folder' ? scopeKey : undefined,
        type: onlyType || undefined,
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });
      setItems(res.media || []);
      setTotal(res.total || 0);
      setState('success');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }, [scopeKey, page, onlyType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [scopeKey]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickedIds = new Set(picked.map((m) => m.id));
  const toggle = (m) => {
    if (!allowedTypes.includes(m.type)) return;
    setPicked((prev) => {
      if (prev.some((p) => p.id === m.id)) return prev.filter((p) => p.id !== m.id);
      if (prev.length >= max) return prev;
      return [...prev, m];
    });
  };

  const selectPage = () => {
    setPicked((prev) => {
      const next = [...prev];
      for (const m of items) {
        if (next.length >= max) break;
        if (allowedTypes.includes(m.type) && !next.some((p) => p.id === m.id)) next.push(m);
      }
      return next;
    });
  };

  return (
    <div className="sf-batch-modal__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sf-batch-modal sf-lib-picker" role="dialog" aria-modal="true" aria-label="Escolher da biblioteca">
        <div className="sf-batch-modal__header">
          <div>
            <h3 className="sf-batch-modal__title">Escolher da biblioteca</h3>
            <p className="sf-field-hint">
              {picked.length} de até {max} selecionada(s){onlyType ? ` · só ${onlyType === 'VIDEO' ? 'vídeos' : 'imagens'}` : ''}
            </p>
          </div>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="sf-lib-picker__bar">
          <select
            className="sf-select"
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            aria-label="Pasta"
          >
            <option value="all">Todas ({counts.all})</option>
            <option value="root">Sem pasta ({counts.root})</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.count})
              </option>
            ))}
          </select>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={selectPage} disabled={items.length === 0}>
            Selecionar página
          </button>
        </div>

        <div className="sf-lib-picker__body">
          {state === 'loading' && <p className="sf-field-hint">Carregando...</p>}
          {state === 'error' && <p className="sf-field-hint sf-field-hint--error">{error}</p>}
          {state === 'success' && items.length === 0 && (
            <p className="sf-field-hint">Nenhuma mídia nesta pasta. Envie pela página Biblioteca.</p>
          )}
          {state === 'success' && items.length > 0 && (
            <ul className="sf-lib-grid sf-lib-grid--small">
              {items.map((m) => {
                const allowed = allowedTypes.includes(m.type);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`sf-lib-thumb${pickedIds.has(m.id) ? ' is-selected' : ''}${allowed ? '' : ' is-disabled'}`}
                      onClick={() => toggle(m)}
                      disabled={!allowed}
                      aria-pressed={pickedIds.has(m.id)}
                    >
                      <MediaThumb media={m} />
                      <span className="sf-lib-thumb__check" aria-hidden="true">
                        {pickedIds.has(m.id) ? picked.findIndex((p) => p.id === m.id) + 1 : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        </div>

        <div className="sf-batch-modal__actions">
          <button
            type="button"
            className="sf-button sf-button--primary"
            onClick={() => onPick(picked)}
            disabled={picked.length === 0}
          >
            Adicionar {picked.length || ''} mídia{picked.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}