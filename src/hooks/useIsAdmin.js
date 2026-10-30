import { useEffect, useState } from 'react';
import { getToken } from '../services/api.js';
import * as invitesService from '../services/invitesService.js';

// Rodada 11: is the logged-in user a platform admin? Cached per token so
// every page change doesn't hit the API. Any error = not admin (the menu
// item simply stays hidden; the backend protects the endpoints anyway).
let cache = { token: null, value: null, promise: null };

function fetchIsAdmin(token) {
  if (cache.token === token && cache.value !== null) return Promise.resolve(cache.value);
  if (cache.token === token && cache.promise) return cache.promise;
  cache = { token, value: null, promise: null };
  cache.promise = invitesService
    .getAdminMe()
    .then((res) => Boolean(res?.isAdmin))
    .catch(() => false)
    .then((value) => {
      if (cache.token === token) cache.value = value;
      return value;
    });
  return cache.promise;
}

export function useIsAdmin() {
  const token = getToken();
  const [isAdmin, setIsAdmin] = useState(cache.token === token && cache.value !== null ? cache.value : false);

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return undefined;
    }
    let alive = true;
    fetchIsAdmin(token).then((value) => alive && setIsAdmin(value));
    return () => {
      alive = false;
    };
  }, [token]);

  return isAdmin;
}