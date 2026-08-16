import { POST_TYPE_LABELS, POST_TYPE_HINTS } from '../utils/postConstants.js';

const TYPES = ['FEED_IMAGE', 'FEED_VIDEO', 'FEED_CAROUSEL', 'REEL', 'STORY'];

// Grid of pill-style buttons that lets the user pick the post format.
// The chosen hint (aspect ratio, size limit) shows below so the composer
// stays honest about Instagram's constraints without popping modals.
export default function PostTypeSelector({ value, onChange, disabled = false }) {
  return (
    <div className="sf-type-selector">
      <div className="sf-type-selector__grid">
        {TYPES.map((type) => {
          const isActive = type === value;
          return (
            <button
              key={type}
              type="button"
              className={`sf-type-selector__option${isActive ? ' sf-type-selector__option--active' : ''}`}
              onClick={() => onChange(type)}
              disabled={disabled}
            >
              {POST_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {value && POST_TYPE_HINTS[value] && (
        <p className="sf-type-selector__hint">{POST_TYPE_HINTS[value]}</p>
      )}
    </div>
  );
}