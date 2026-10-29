import { useCallback, useEffect, useRef, useState } from 'react';
import * as notificationsService from '../services/notificationsService.js';

// Rodada 5: unread counter polled every minute (cheap COUNT query) + the
// list loaded on demand when the bell opens. If the backend doesn't have
// the notifications API yet, `available` turns false and the bell hides.
const POLL_MS = 60 * 1000;

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [available, setAvailable] = useState(true);
  const mounted = useRef(true);

  const refreshCount = useCallback(async () => {
    try {
      const { unreadCount: count } = await notificationsService.getUnreadCount();
      if (mounted.current) setUnreadCount(count || 0);
    } catch (err) {
      if (mounted.current && (err.status === 404 || err.code === 'NOT_FOUND')) setAvailable(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setStatus('loading');
    try {
      const { notifications, unreadCount: count } = await notificationsService.listNotifications({ take: 30 });
      if (!mounted.current) return;
      setItems(notifications || []);
      setUnreadCount(count || 0);
      setStatus('success');
    } catch {
      if (mounted.current) setStatus('error');
    }
  }, []);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsService.markNotificationRead(id);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await notificationsService.markAllNotificationsRead();
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    mounted.current = true;
    refreshCount();
    const timer = setInterval(refreshCount, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refreshCount]);

  return { available, unreadCount, items, status, loadList, markRead, markAllRead };
}