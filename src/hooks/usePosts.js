import { useCallback, useEffect, useState } from 'react';
import * as postsService from '../services/postsService.js';

// Loads and refreshes the posts list. `statusFilter` is null to fetch all.
// Follows the same idle | loading | success | error pattern as
// useInstagramAccounts to keep pages focused on rendering.
export function usePosts(statusFilter = null) {
  const [status, setStatus] = useState('loading');
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // The backend response is { success: true, posts: [...] } - properties
      // are at the root of the body, matching how listAccounts is consumed
      // elsewhere in this codebase.
      const { posts: fetched } = await postsService.listPosts(
        statusFilter ? { status: statusFilter } : {}
      );
      setPosts(fetched || []);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [statusFilter]);

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

  return { status, posts, error, reload: load, archive, remove };
}