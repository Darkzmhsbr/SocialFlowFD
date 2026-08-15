import { useEffect } from 'react';
import '../styles/toast.css';

export default function Toast({ message, tone = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className={`sf-toast sf-toast--${tone}`} role="status">
      <span>{message}</span>
      <button type="button" className="sf-toast__close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
    </div>
  );
}
