import { useState } from 'react';
import { getAuthorizeUrl } from '../services/instagramService.js';

// Fetches the authorize URL (with Bearer attached automatically), then
// redirects the browser to Meta. This replaces the old <a href> pattern
// where the browser navigated directly and dropped the JWT along the way -
// which used to work when defaultUserId was hardcoded, but stopped
// working once Phase 3.3 tied every OAuth flow to a specific user.
export default function ConnectInstagramButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await getAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar a conexão.');
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="sf-button sf-button--primary"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? 'Abrindo Instagram...' : '+ Conectar Instagram'}
      </button>
      {error && <p className="sf-field-hint sf-field-hint--error">{error}</p>}
    </>
  );
}