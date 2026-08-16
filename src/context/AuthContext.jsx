import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService.js';
import { clearToken, getToken, setToken } from '../services/api.js';

// Global auth state. Wraps the app in <AuthProvider> so any component can
// call useAuth() and get { status, user, login, register, logout } without
// prop drilling.
//
// status is a small state machine:
//   loading         - checking stored token against /me on first mount
//   unauthenticated - no token, or /me rejected it
//   authenticated   - user is populated and safe to use
//
// The dashboard doesn't require auth in Phase 3.2 - it just renders
// whatever the (legacy) defaultUserId endpoints return. Only Phase 3.3
// wires requireAuth into the app-critical routes.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  // On first mount, if we have a stored token, try to validate it against
  // /me. If it works, we skip a login step. If it fails, we silently drop
  // the stale token and land as unauthenticated - normal for expired JWTs.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { user: fetched } = await authService.me();
        if (cancelled) return;
        setUser(fetched);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        clearToken();
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { user: fetched, token } = await authService.login({ email, password });
    setToken(token);
    setUser(fetched);
    setStatus('authenticated');
    return fetched;
  }, []);

  const register = useCallback(async ({ email, password, name, inviteCode }) => {
    const { user: fetched, token } = await authService.register({
      email,
      password,
      name,
      inviteCode,
    });
    setToken(token);
    setUser(fetched);
    setStatus('authenticated');
    return fetched;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // best-effort - if the server is down we still clear locally
    }
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}