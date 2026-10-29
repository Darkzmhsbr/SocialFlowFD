import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/notifications.css';

// Rodada 5: bell in the header with unread badge + dropdown panel.
export default function NotificationBell() {
  const { available, unreadCount, items, status, loadList, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!available) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  return (
    <div className="sf-bell" ref={rootRef}>
      <button
        type="button"
        className="sf-bell__button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : 'Notificações'}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21Z"
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 && <span className="sf-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="sf-bell__panel" role="dialog" aria-label="Notificações">
          <div className="sf-bell__header">
            <strong>Notificações</strong>
            <button
              type="button"
              className="sf-bell__mark-all"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              Marcar todas como lidas
            </button>
          </div>

          {status === 'loading' && items.length === 0 && <p className="sf-bell__empty">Carregando...</p>}
          {status === 'error' && <p className="sf-bell__empty">Não foi possível carregar as notificações.</p>}
          {status === 'success' && items.length === 0 && <p className="sf-bell__empty">Nenhuma notificação ainda.</p>}

          {items.length > 0 && (
            <ul className="sf-bell__list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`sf-bell__item sf-bell__item--${n.severity}${n.readAt ? '' : ' is-unread'}`}
                    onClick={() => !n.readAt && markRead(n.id)}
                  >
                    <span className="sf-bell__dot" aria-hidden="true" />
                    <span className="sf-bell__content">
                      <span className="sf-bell__title">{n.title}</span>
                      {n.message && <span className="sf-bell__message">{n.message}</span>}
                      <span className="sf-bell__time">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}