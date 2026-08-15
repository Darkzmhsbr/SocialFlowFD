// Every backend call in the app goes through here. Nothing else in the
// React codebase should call fetch() directly or read VITE_API_URL -
// that keeps the Meta/Instagram integration entirely out of components.

const API_URL = import.meta.env.VITE_API_URL;

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
