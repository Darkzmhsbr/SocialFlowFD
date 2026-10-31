import { useState } from 'react';
import { getAuthorizeUrl } from '../services/instagramService.js';
import '../styles/button.css';
// Rodada 20: choose "Abrir aqui" or "Copiar link (multilogin)".
import ConnectChoiceModal from './ConnectChoiceModal.jsx';

// Fetches the authorize URL (with Bearer attached automatically), then
// redirects the browser to Meta. This replaces the old <a href> pattern
// where the browser navigated directly and dropped the JWT along the way -
// which used to work when defaultUserId was hardcoded, but stopped
// working once Phase 3.3 tied every OAuth flow to a specific user.
export default function ConnectInstagramButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [choosing, setChoosing] = useState(false); // Rodada 20

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
        onClick={() => setChoosing(true)} // Rodada 20: was onClick={handleClick} (now "Abrir aqui" inside the modal)
        disabled={busy}
      >
        {busy ? 'Abrindo Instagram...' : '+ Conectar Instagram'}
      </button>
      {error && <p className="sf-field-hint sf-field-hint--error">{error}</p>}
      {/* Rodada 20 */}
      {choosing && <ConnectChoiceModal onClose={() => setChoosing(false)} />}
    </>
  );
}