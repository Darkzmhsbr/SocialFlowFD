import { useCallback, useEffect, useRef, useState } from 'react';
import * as postsService from '../services/postsService.js';

// Rodada 6: data for the Agendamentos page — one page of posts + the
// counters (overview) with the same filters. `refresh({ silent: true })`
// reloads without the loading state, used by the auto-refresh so the list
// doesn't flash every 30s. Only the latest request may update state.
export function useSchedules({ status, types, accountId, q, page = 0, pageSize = 50 }) {
  const [loadState, setLoadState] = useState('loading'); // loading | success | error
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const seq = useRef(0);
  const typesKey = (types || []).join(',');

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      const mySeq = ++seq.current;
      if (!silent) {
        setLoadState('loading');
        setError(null);
      }
      const filters = { status, types: typesKey ? typesKey.split(',') : undefined, accountId, q };
      try {
        const [list, ov] = await Promise.all([
          postsService.queryPosts({ ...filters, take: pageSize, skip: page * pageSize }),
          postsService.getPostsOverview(filters),
        ]);
        if (mySeq !== seq.current) return;
        setPosts(list.posts || []);
        setTotal(typeof list.total === 'number' ? list.total : (list.posts || []).length);
        setOverview(ov || null);
        setLastUpdated(new Date());
        setLoadState('success');
      } catch (err) {
        if (mySeq !== seq.current) return;
        if (!silent) {
          setError(err.message);
          setLoadState('error');
        }
      }
    },
    [status, typesKey, accountId, q, page, pageSize]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loadState, posts, total, overview, error, lastUpdated, refresh };
}