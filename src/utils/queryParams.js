// Reads the `?instagram=connected|denied|error` param the backend appends
// after the OAuth callback, then strips it from the URL so a page refresh
// doesn't re-trigger the same toast.

export function readAndClearParam(name) {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(name);

  if (value !== null) {
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
  }

  return value;
}
