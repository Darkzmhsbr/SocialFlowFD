import { useCallback, useEffect, useRef, useState } from 'react';
import * as postsService from '../services/postsService.js';

// Rodada 4.1: paginated version of usePosts for the /posts page. Same
// idle | loading | success | error contract and the same archive/remove
// helpers, plus account filter, page and total. usePosts stays untouched
// for any other screen that uses it.
export function usePostsPage(statusFilter = null, { accountId = null, page = 0, pageSize = 50 } = {}) {
  const [status, setStatus] = useState('loading');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  // Only the latest request may update state: switching tab/page quickly
  // fires overlapping requests, and a slow older one must not overwrite
  // the newer page.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setStatus('loading');
    setError(null);
    try {
      const res = await postsService.listPostsPage({
        status: statusFilter || undefined,
        accountId: accountId || undefined,
        take: pageSize,
        skip: page * pageSize,
      });
      if (seq !== requestSeq.current) return;
      const fetched = res.posts || [];
      setPosts(fetched);
      // Older backend without `total`: estimate so pagination still works.
      setTotal(typeof res.total === 'number' ? res.total : page * pageSize + fetched.length);
      setStatus('success');
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message);
      setStatus('error');
    }
  }, [statusFilter, accountId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const archive = useCallback(
    async (id) => {
      await postsService.archivePost(id);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      await postsService.deletePost(id);
      await load();
    },
    [load]
  );

  return { status, posts, total, error, reload: load, archive, remove };
}