import { useEffect, useRef, useState } from 'react';
import { useMediaUpload } from '../hooks/useMediaUpload.js';
import { POST_TYPE_RULES } from '../utils/postConstants.js';

// Rodada 4: multi-file picker for the batch composer. The original
// MediaUploader stays untouched (one file, capped at the post type's max).
//
// Here the user can select many files at once (Ctrl/Shift in the dialog).
// Files are uploaded ONE AT A TIME through the same useMediaUpload hook —
// 20 parallel 100MB uploads would saturate the browser and Railway. Every
// finished upload is handed to the parent immediately via onUploaded, so
// items appear in the list while the rest are still sending. Wrong-type
// files and anything above the limit are skipped and reported once.

const MIMES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png'],
  VIDEO: ['video/mp4', 'video/quicktime'],
};
const EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png'],
  VIDEO: ['.mp4', '.mov'],
};

export default function BatchMediaUploader({
  postType,
  currentCount,
  max,
  onUploaded,
  onError,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const mountedRef = useRef(true);
  const { upload } = useMediaUpload();
  const [progress, setProgress] = useState(null); // { done, total, name } | null

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const rules = POST_TYPE_RULES[postType] || { allowed: ['IMAGE'] };
  const remaining = Math.max(0, max - currentCount);
  const isFull = remaining === 0;
  const isUploading = progress !== null;

  const accept = rules.allowed
    .flatMap((t) => (t === 'IMAGE' ? ['image/jpeg', 'image/png'] : ['video/mp4', 'video/quicktime']))
    .join(',');

  const isAllowedFile = (file) =>
    rules.allowed.some((t) => {
      if (file.type && MIMES[t].includes(file.type)) return true;
      // Some browsers report an empty type for .mov — fall back to extension.
      const name = (file.name || '').toLowerCase();
      return !file.type && EXTENSIONS[t].some((ext) => name.endsWith(ext));
    });

  const handleClick = () => {
    if (disabled || isFull || isUploading) return;
    inputRef.current?.click();
  };

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    // reset the input so the same files can be picked again after removal
    e.target.value = '';
    if (files.length === 0) return;

    const problems = [];
    const valid = files.filter(isAllowedFile);
    if (valid.length < files.length) {
      problems.push(`${files.length - valid.length} arquivo(s) ignorado(s): tipo não aceito neste tipo de post.`);
    }

    const toSend = valid.slice(0, remaining);
    if (valid.length > remaining) {
      problems.push(`Limite de ${max} mídias: ${valid.length - remaining} arquivo(s) ficaram de fora.`);
    }

    for (let i = 0; i < toSend.length; i++) {
      const file = toSend[i];
      if (mountedRef.current) setProgress({ done: i, total: toSend.length, name: file.name });
      try {
        const media = await upload(file);
        if (mountedRef.current) onUploaded(media);
      } catch (err) {
        problems.push(`${file.name}: ${err.message || 'falha no upload'}`);
      }
    }

    if (mountedRef.current) setProgress(null);
    if (problems.length > 0) onError?.(problems.join(' '));
  };

  const helper = isFull
    ? `Limite atingido (${max} mídias por lote).`
    : `Selecione várias de uma vez (Ctrl ou Shift). ${currentCount} de ${max} adicionadas.`;

  const percent = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="sf-batch-uploader">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="sf-batch-uploader__row">
        <button
          type="button"
          className="sf-button sf-button--secondary"
          onClick={handleClick}
          disabled={disabled || isFull || isUploading}
        >
          {isUploading ? 'Enviando...' : '+ Adicionar mídias'}
        </button>
        <span className="sf-field-hint">{helper}</span>
      </div>

      {progress && (
        <div className="sf-batch-uploader__progress" role="status" aria-live="polite">
          <div className="sf-batch-uploader__bar">
            <div className="sf-batch-uploader__bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="sf-field-hint">
            Enviando {progress.done + 1} de {progress.total}: {progress.name}
          </span>
        </div>
      )}
    </div>
  );
}