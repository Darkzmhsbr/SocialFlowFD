import { useRef, useState } from 'react';
import { useMediaLibrary } from '../hooks/useMediaLibrary.js';
import { useMediaUpload } from '../hooks/useMediaUpload.js';
import '../styles/coverPicker.css';

// Composable cover picker for FEED_VIDEO / REEL posts. Shows current cover
// as a small preview when set, and a button to open an expandable panel
// with two tabs:
//   - Biblioteca: grid of existing IMAGE assets the user has uploaded
//   - Enviar nova: file input that uploads directly and selects the result
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

  const {
    status: libStatus,
    items: libraryImages,
    error: libError,
    reload: reloadLibrary,
    prepend: prependLibrary,
  } = useMediaLibrary({ typeFilter: 'IMAGE' });

  const { status: uploadStatus, upload } = useMediaUpload();
  const fileInputRef = useRef(null);

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
      const media = await upload(file);
      if (media.type !== 'IMAGE') {
        setUploadError('A capa precisa ser uma imagem. Envie um JPG ou PNG.');
        return;
      }
      prependLibrary(media);
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
              {libStatus === 'loading' && (
                <p className="sf-cover-picker__hint">Carregando suas mídias...</p>
              )}
              {libStatus === 'error' && (
                <div className="sf-cover-picker__error">
                  <p>{libError}</p>
                  <button
                    type="button"
                    className="sf-button sf-button--secondary"
                    onClick={reloadLibrary}
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              {libStatus === 'success' && libraryImages.length === 0 && (
                <div className="sf-cover-picker__empty-library">
                  <p>Você ainda não tem imagens enviadas.</p>
                  <button
                    type="button"
                    className="sf-button sf-button--secondary"
                    onClick={() => setTab('upload')}
                  >
                    Enviar a primeira
                  </button>
                </div>
              )}
              {libStatus === 'success' && libraryImages.length > 0 && (
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
                        >
                          <img src={media.url} alt="" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div className="sf-cover-picker__upload">
              <p className="sf-cover-picker__hint">
                Envie uma imagem JPG ou PNG. Para melhor resultado, use a
                mesma proporção do vídeo (9:16 para Reels).
              </p>
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