import CaptionEditor from './CaptionEditor.jsx';
import CoverPicker from './CoverPicker.jsx';

// Rodada 4: the media items of a batch. Each item becomes one post on
// every selected profile. Per item the user can:
//   - keep the shared caption, or write its own
//   - keep the shared cover, pick its own, or publish without cover
//     (cover options only for types that accept cover: FEED_VIDEO / REEL)
//   - reorder (order = publish order when staggering) or remove
//
// Item shape (owned by BatchPostComposer):
//   { key, media, useOwnCaption, caption, coverMode: 'shared'|'own'|'none', cover }
//
// CoverPicker is only mounted for items in 'own' mode, so 20 items don't
// open 20 media-library requests at once.
export default function BatchItemList({ items, onChange, allowsCover, disabled = false }) {
  if (items.length === 0) {
    return <p className="sf-field-hint">Nenhuma mídia adicionada ainda.</p>;
  }

  const update = (key, patch) => {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const remove = (key) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <ol className="sf-batch-items">
      {items.map((item, index) => (
        <li key={item.key} className="sf-batch-item">
          <div className="sf-batch-item__head">
            <span className="sf-batch-item__index">{index + 1}</span>

            <div className="sf-batch-item__thumb">
              {item.media.type === 'IMAGE' ? (
                <img src={item.media.url} alt="" />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={item.media.url} muted playsInline preload="metadata" />
              )}
            </div>

            <div className="sf-batch-item__info">
              <span className="sf-batch-item__type">{item.media.type === 'VIDEO' ? 'Vídeo' : 'Imagem'}</span>
              <span className="sf-field-hint">
                {item.useOwnCaption ? 'Legenda própria' : 'Legenda geral'}
                {allowsCover &&
                  ` · ${
                    item.coverMode === 'own' ? 'Capa própria' : item.coverMode === 'none' ? 'Sem capa' : 'Capa geral'
                  }`}
              </span>
            </div>

            <div className="sf-batch-item__actions">
              <button
                type="button"
                className="sf-button sf-button--secondary sf-button--small"
                onClick={() => move(index, index - 1)}
                disabled={disabled || index === 0}
                aria-label="Mover para cima"
              >
                ↑
              </button>
              <button
                type="button"
                className="sf-button sf-button--secondary sf-button--small"
                onClick={() => move(index, index + 1)}
                disabled={disabled || index === items.length - 1}
                aria-label="Mover para baixo"
              >
                ↓
              </button>
              <button
                type="button"
                className="sf-button sf-button--danger sf-button--small"
                onClick={() => remove(item.key)}
                disabled={disabled}
              >
                Remover
              </button>
            </div>
          </div>

          <div className="sf-batch-item__options">
            <label className="sf-batch-item__check">
              <input
                type="checkbox"
                checked={item.useOwnCaption}
                onChange={(e) => update(item.key, { useOwnCaption: e.target.checked })}
                disabled={disabled}
              />
              Legenda própria para esta mídia
            </label>

            {allowsCover && (
              <label className="sf-batch-item__select">
                Capa:
                <select
                  className="sf-select"
                  value={item.coverMode}
                  onChange={(e) =>
                    update(item.key, {
                      coverMode: e.target.value,
                      cover: e.target.value === 'own' ? item.cover : null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="shared">Usar a capa geral</option>
                  <option value="own">Capa própria</option>
                  <option value="none">Sem capa (Instagram escolhe um frame)</option>
                </select>
              </label>
            )}
          </div>

          {item.useOwnCaption && (
            <div className="sf-batch-item__panel">
              <CaptionEditor
                value={item.caption}
                onChange={(caption) => update(item.key, { caption })}
                disabled={disabled}
              />
            </div>
          )}

          {allowsCover && item.coverMode === 'own' && (
            <div className="sf-batch-item__panel">
              <CoverPicker
                value={item.cover}
                onChange={(cover) => update(item.key, { cover })}
                disabled={disabled}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}