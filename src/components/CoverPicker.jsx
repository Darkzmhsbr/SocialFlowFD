import { useCallback, useEffect, useRef, useState } from 'react';
import Pagination from './Pagination.jsx';
import { useMediaUpload } from '../hooks/useMediaUpload.js';
import * as mediaService from '../services/mediaService.js';
import '../styles/coverPicker.css';
import '../styles/library.css';

const PAGE_SIZE = 48;

// Composable cover picker for FEED_VIDEO / REEL posts. Shows current cover
// as a small preview when set, and a button to open an expandable panel
// with two tabs:
//   - Biblioteca: folder selector + grid of existing IMAGE assets in the library
//   - Enviar nova: file input that uploads directly to the selected library folder
//
// The parent controls the value via {value, onChange}. `value` is either
// null or a full media object ({id, url, type, ...}). `onChange(media|null)`
// is called whenever the selection changes.
//
// Parent is responsible for:
//   - only rendering this when the post type allows cover (allowsCover)
//   - resetting to null when the type changes to one that doesn't accept cover
export default function CoverPicker({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('library'); // 'library' | 'upload'
  const [uploadError, setUploadError] = useState(null);

  // Rodada 7+ folders & library state (same folder navigation as LibraryPicker)
  const [folders, setFolders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, root: 0 });
  const [scopeKey, setScopeKey] = useState('all'); // 'all' | 'root' | folderId
  const [uploadFolderId, setUploadFolderId] = useState(''); // '' = Sem pasta, or folderId
  const [libraryImages, setLibraryImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [libStatus, setLibStatus] = useState('loading');
  const [libError, setLibError] = useState(null);
  const autoSelectedFolderRef = useRef(false);

  const { status: uploadStatus, upload } = useMediaUpload();
  const fileInputRef = useRef(null);

  const loadFolders = useCallback(async () => {
    try {
      const res = await mediaService.listFolders();
      const folderList = res.folders || [];
      setFolders(folderList);
      setCounts(res.counts || { all: 0, root: 0 });

      // Automatically pre-select the "Capas" folder if it exists on first open
      if (!autoSelectedFolderRef.current && folderList.length > 0) {
        const capasFolder = folderList.find(
          (f) => String(f.name || '').trim().toLowerCase() === 'capas'
        );
        if (capasFolder) {
          autoSelectedFolderRef.current = true;
          setScopeKey(capasFolder.id);
          setUploadFolderId(capasFolder.id);
        }
      }
    } catch {
      // ignore folder list errors; items still load
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    setLibStatus('loading');
    setLibError(null);
    try {
      const scope = scopeKey === 'all' || scopeKey === 'root' ? scopeKey : 'folder';
      const res = await mediaService.listLibrary({
        scope,
        folderId: scope === 'folder' ? scopeKey : undefined,
        type: 'IMAGE',
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });
      setLibraryImages(res.media || []);
      setTotal(res.total || 0);
      setLibStatus('success');
    } catch (err) {
      setLibError(err.message || 'Erro ao carregar capas da biblioteca.');
      setLibStatus('error');
    }
  }, [scopeKey, page]);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, loadFolders]);

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
    }
  }, [isOpen, loadLibrary]);

  useEffect(() => {
    setPage(0);
    if (scopeKey !== 'all' && scopeKey !== 'root') {
      setUploadFolderId(scopeKey);
    } else if (scopeKey === 'root') {
      setUploadFolderId('');
    }
  }, [scopeKey]);

  const handleSelect = (media) => {
    onChange(media);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setUploadError(null);
  };

  const handleUploadClick = () => {
    if (uploadStatus === 'uploading') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    try {
      // Rodada 7: covers are kept in the Biblioteca (reusable, never auto-deleted)
      // and saved directly into the chosen folder (e.g. "Capas").
      const targetFolderId =
        uploadFolderId || (scopeKey !== 'all' && scopeKey !== 'root' ? scopeKey : undefined);
      const media = await upload(file, {
        library: true,
        ...(targetFolderId ? { folderId: targetFolderId } : {}),
      });
      if (media.type !== 'IMAGE') {
        setUploadError('A capa precisa ser uma imagem. Envie um JPG ou PNG.');
        return;
      }
      setLibraryImages((prev) => [media, ...prev.filter((m) => m.id !== media.id)]);
      loadFolders();
      handleSelect(media);
    } catch (err) {
      setUploadError(err.message || 'Falha no upload da capa.');
    }
  };

  return (
    <div className="sf-cover-picker">
      {value ? (
        <div className="sf-cover-picker__current">
          <div className="sf-cover-picker__preview">
            <img src={value.url} alt="Capa selecionada" />
          </div>
          <div className="sf-cover-picker__current-actions">
            <button
              type="button"
              className="sf-button sf-button--secondary"
              onClick={handleOpen}
              disabled={disabled}
            >
              Trocar capa
            </button>
            <button
              type="button"
              className="sf-button sf-button--danger"
              onClick={handleClear}
              disabled={disabled}
              title="Sem capa customizada, o Instagram escolhe um frame automaticamente"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div className="sf-cover-picker__empty">
          <button
            type="button"
            className="sf-button sf-button--secondary"
            onClick={handleOpen}
            disabled={disabled}
          >
            + Escolher capa
          </button>
          <span className="sf-field-hint">
            Opcional. Sem capa, o Instagram escolhe um frame do vídeo.
          </span>
        </div>
      )}

      {isOpen && (
        <div className="sf-cover-picker__panel">
          <div className="sf-cover-picker__panel-head">
            <div className="sf-cover-picker__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'library'}
                className={`sf-cover-picker__tab ${tab === 'library' ? 'sf-cover-picker__tab--active' : ''}`}
                onClick={() => setTab('library')}
              >
                Biblioteca
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'upload'}
                className={`sf-cover-picker__tab ${tab === 'upload' ? 'sf-cover-picker__tab--active' : ''}`}
                onClick={() => setTab('upload')}
              >
                Enviar nova
              </button>
            </div>
            <button
              type="button"
              className="sf-icon-button"
              aria-label="Fechar"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          {tab === 'library' && (
            <div className="sf-cover-picker__library">
              <div className="sf-lib-picker__bar" style={{ marginBottom: '12px' }}>
                <select
                  className="sf-select"
                  value={scopeKey}
                  onChange={(e) => setScopeKey(e.target.value)}
                  aria-label="Pasta da biblioteca"
                >
                  <option value="all">Todas ({counts.all})</option>
                  <option value="root">Sem pasta ({counts.root})</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.count})
                    </option>
                  ))}
                </select>
              </div>

              {libStatus === 'loading' && (
                <p className="sf-cover-picker__hint">Carregando suas capas...</p>
              )}
              {libStatus === 'error' && (
                <div className="sf-cover-picker__error">
                  <p>{libError}</p>
                  <button
                    type="button"
                    className="sf-button sf-button--secondary"
                    onClick={loadLibrary}
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              {libStatus === 'success' && libraryImages.length === 0 && (
                <div className="sf-cover-picker__empty-library">
                  <p>Nenhuma imagem de capa encontrada nesta pasta.</p>
                  <button
                    type="button"
                    className="sf-button sf-button--secondary"
                    onClick={() => setTab('upload')}
                  >
                    Enviar nova capa
                  </button>
                </div>
              )}
              {libStatus === 'success' && libraryImages.length > 0 && (
                <>
                  <ul className="sf-cover-picker__grid">
                    {libraryImages.map((media) => {
                      const isSelected = value?.id === media.id;
                      return (
                        <li key={media.id}>
                          <button
                            type="button"
                            className={`sf-cover-picker__tile ${isSelected ? 'sf-cover-picker__tile--selected' : ''}`}
                            onClick={() => handleSelect(media)}
                            aria-label="Escolher esta imagem como capa"
                            title={media.originalName || 'Escolher capa'}
                          >
                            <img src={media.url} alt="" loading="lazy" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                </>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div className="sf-cover-picker__upload">
              <p className="sf-cover-picker__hint">
                Envie uma imagem JPG ou PNG. Para melhor resultado, use a
                mesma proporção do vídeo (9:16 para Reels). Ela ficará salva na sua Biblioteca.
              </p>
              {folders.length > 0 && (
                <div className="sf-lib-picker__bar" style={{ marginBottom: '12px' }}>
                  <select
                    className="sf-select"
                    value={uploadFolderId}
                    onChange={(e) => setUploadFolderId(e.target.value)}
                    aria-label="Salvar na pasta"
                    disabled={uploadStatus === 'uploading'}
                  >
                    <option value="">Salvar em: Sem pasta</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        Salvar na pasta: {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="sf-button sf-button--primary"
                onClick={handleUploadClick}
                disabled={uploadStatus === 'uploading'}
              >
                {uploadStatus === 'uploading' ? 'Enviando...' : 'Escolher arquivo'}
              </button>
              {uploadError && (
                <p className="sf-cover-picker__error-msg">{uploadError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}