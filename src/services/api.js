// Every backend call in the app goes through here. Nothing else in the
// React codebase should call fetch() directly or read VITE_API_URL -
// that keeps the Meta/Instagram integration entirely out of components.
//
// Phase 3.2: transparently injects Authorization: Bearer <token> when a
// token is stored. Callers that need to override the header (rare) can
// still pass their own via options.headers.

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_STORAGE_KEY = 'sf_token';

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage can be disabled (private mode, quota, etc). Fail silent -
    // the session just won't persist across reloads.
  }
}

export function clearToken() {
  setToken(null);
}

async function request(path, options = {}) {
  // FormData uploads need the browser to set Content-Type itself (so the
  // multipart boundary is included). Forcing application/json in that case
  // breaks the request. We only default to JSON when the caller didn't set
  // a Content-Type and the body isn't a FormData instance.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };

  if (!isFormData && !('Content-Type' in headers) && !('content-type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  // Phase 3.2: attach the stored JWT if the caller didn't set one manually.
  // Rotas antigas (que usam defaultUserId) ignoram esse header, então isso
  // é seguro pra coexistir com o app pre-auth.
  const token = getToken();
  if (token && !('Authorization' in headers) && !('authorization' in headers)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // no JSON body (e.g. redirects handled by the browser already)
  }

  if (!response.ok || body?.success === false) {
    throw new ApiError(
      body?.error?.message || 'Não foi possível completar a solicitação.',
      body?.error?.code || 'UNKNOWN_ERROR',
      response.status
    );
  }

  return body;
}

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

export { request, ApiError };