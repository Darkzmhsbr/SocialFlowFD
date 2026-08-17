import { useCallback, useEffect, useState } from 'react';
import * as mediaService from '../services/mediaService.js';

// Loads the current user's uploaded media library. Optional client-side
// type filter (e.g. { typeFilter: 'IMAGE' } for the CoverPicker) — kept
// client-side because the backend list endpoint doesn't currently support
// a type filter and adding one is trivial to do later without changing
// this hook's contract.
//
// Follows the same idle | loading | success | error pattern as
// usePosts / useInstagramAccounts.
export function useMediaLibrary({ typeFilter = null, take = 100 } = {}) {
  const [status, setStatus] = useState('loading');
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Backend returns { success, medias: [...] } spread at root, matching
      // the apiResponse convention used by listPosts/listAccounts.
      const res = await mediaService.listMedia({ take });
      const all = res?.medias || [];
      const filtered = typeFilter ? all.filter((m) => m.type === typeFilter) : all;
      setItems(filtered);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Erro ao carregar suas mídias.');
      setStatus('error');
    }
  }, [typeFilter, take]);

  useEffect(() => {
    load();
  }, [load]);

  // Local prepend for freshly uploaded media, so the CoverPicker can show
  // the new upload immediately without a full reload round-trip.
  const prepend = useCallback((media) => {
    if (!media) return;
    if (typeFilter && media.type !== typeFilter) return;
    setItems((prev) => [media, ...prev.filter((m) => m.id !== media.id)]);
  }, [typeFilter]);

  return { status, items, error, reload: load, prepend };
}