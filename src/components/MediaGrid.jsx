// Renders the medias already attached to the post, with per-item controls:
// remove, move up, move down. Carousels are the only type where order
// actually matters; the arrows are hidden for single-media types.
export default function MediaGrid({ medias, onRemove, onReorder, isCarousel }) {
  if (!medias.length) {
    return (
      <div className="sf-media-grid sf-media-grid--empty">
        Nenhuma mídia adicionada ainda.
      </div>
    );
  }

  return (
    <ul className="sf-media-grid">
      {medias.map((media, index) => (
        <li key={media.id} className="sf-media-grid__item">
          <div className="sf-media-grid__thumb">
            {media.type === 'IMAGE' ? (
              <img src={media.url} alt="" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={media.url} muted playsInline preload="metadata" />
            )}
            <span className="sf-media-grid__type-tag">
              {media.type === 'IMAGE' ? 'Foto' : 'Vídeo'}
            </span>
          </div>

          <div className="sf-media-grid__controls">
            {isCarousel && (
              <>
                <button
                  type="button"
                  className="sf-icon-button"
                  onClick={() => onReorder(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Mover para cima"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="sf-icon-button"
                  onClick={() => onReorder(index, index + 1)}
                  disabled={index === medias.length - 1}
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
              </>
            )}
            <button
              type="button"
              className="sf-icon-button sf-icon-button--danger"
              onClick={() => onRemove(media.id)}
              aria-label="Remover mídia"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}