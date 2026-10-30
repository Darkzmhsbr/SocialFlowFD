// Rodada 7: square thumbnail for library grids (image or muted video).
export default function MediaThumb({ media }) {
  if (!media) return null;
  return media.type === 'VIDEO' ? (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video className="sf-lib-thumb__media" src={media.url} muted playsInline preload="metadata" />
  ) : (
    <img className="sf-lib-thumb__media" src={media.url} alt="" loading="lazy" />
  );
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}