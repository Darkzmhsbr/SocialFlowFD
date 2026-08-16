import { CAPTION_MAX_LENGTH } from '../utils/postConstants.js';

// Controlled textarea with a live character counter. Warns when the caption
// crosses 90% of Instagram's 2200-char ceiling and blocks additional input
// once it hits the max (native maxLength attribute).
export default function CaptionEditor({ value, onChange, disabled = false }) {
  const length = value?.length || 0;
  const nearingLimit = length >= CAPTION_MAX_LENGTH * 0.9;
  const atLimit = length >= CAPTION_MAX_LENGTH;

  return (
    <div className="sf-caption-editor">
      <label className="sf-field-label" htmlFor="post-caption">
        Legenda
      </label>
      <textarea
        id="post-caption"
        className="sf-textarea"
        value={value}
        maxLength={CAPTION_MAX_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreva a legenda do post..."
        rows={6}
        disabled={disabled}
      />
      <div
        className={`sf-caption-editor__counter${
          atLimit
            ? ' sf-caption-editor__counter--limit'
            : nearingLimit
            ? ' sf-caption-editor__counter--warning'
            : ''
        }`}
      >
        {length} / {CAPTION_MAX_LENGTH}
      </div>
    </div>
  );
}