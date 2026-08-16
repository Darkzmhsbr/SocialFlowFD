import { useRef } from 'react';
import { useMediaUpload } from '../hooks/useMediaUpload.js';
import { POST_TYPE_RULES } from '../utils/postConstants.js';

// Button-styled file picker. On file selection, uploads to the backend and
// hands the resulting media object back to the parent via onUploaded.
// Accept attribute is derived from the selected post type so the file
// dialog pre-filters what the OS shows.
export default function MediaUploader({ postType, currentCount, onUploaded, onError }) {
  const inputRef = useRef(null);
  const { status, upload } = useMediaUpload();

  const rules = POST_TYPE_RULES[postType] || { max: 1, allowed: ['IMAGE'] };
  const isFull = currentCount >= rules.max;
  const isUploading = status === 'uploading';

  const accept = buildAcceptAttr(rules.allowed);

  const handleClick = () => {
    if (isFull || isUploading) return;
    inputRef.current?.click();
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    // reset the input so the same file can be picked again after removal
    e.target.value = '';
    if (!file) return;

    try {
      const media = await upload(file);
      onUploaded(media);
    } catch (err) {
      onError?.(err.message || 'Falha no upload.');
    }
  };

  const helper = isFull
    ? `Limite atingido (${rules.max} mídia${rules.max === 1 ? '' : 's'}).`
    : rules.max === 1
    ? 'Envie 1 mídia.'
    : `Envie de ${rules.min} até ${rules.max} mídias (${currentCount} até agora).`;

  return (
    <div className="sf-media-uploader">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="sf-button sf-button--secondary"
        onClick={handleClick}
        disabled={isFull || isUploading}
      >
        {isUploading ? 'Enviando...' : '+ Adicionar mídia'}
      </button>
      <span className="sf-field-hint">{helper}</span>
    </div>
  );
}

function buildAcceptAttr(allowedTypes) {
  const parts = [];
  if (allowedTypes.includes('IMAGE')) parts.push('image/jpeg', 'image/png');
  if (allowedTypes.includes('VIDEO')) parts.push('video/mp4', 'video/quicktime');
  return parts.join(',');
}