import { useEffect, useState } from 'react';
import * as postsService from '../services/postsService.js';
import { BATCH_LIMITS } from '../utils/postConstants.js';

// Rodada 4.1: batch limits come from the backend (env.batch on Railway),
// so raising a limit there needs no frontend deploy. Until the request
// answers — or if it fails (older backend) — the local BATCH_LIMITS act
// as fallback. Cached at module level: fetched once per page load.
let cachedLimits = null;

export function useBatchLimits() {
  const [limits, setLimits] = useState(cachedLimits || BATCH_LIMITS);

  useEffect(() => {
    if (cachedLimits) return undefined;
    let cancelled = false;
    postsService
      .getBatchLimits()
      .then(({ limits: remote }) => {
        if (!remote) return;
        cachedLimits = { ...BATCH_LIMITS, ...remote };
        if (!cancelled) setLimits(cachedLimits);
      })
      .catch(() => {
        // Keep the fallback silently — the backend still enforces its own limits.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return limits;
}