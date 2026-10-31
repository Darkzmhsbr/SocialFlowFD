import { useEffect, useRef, useState } from 'react';
import { getAuthorizeUrl, getAuthorizeLink } from '../services/instagramService.js';
import '../styles/batch.css';
import '../styles/connect.css';

// Rodada 20: "Conectar com o Instagram" — two ways to authorize:
//   1. Abrir aqui (nesta aba): same flow as before.
//   2. Copiar link (multilogin): a single-use link (5 minutes) to paste in
//      the browser of the profile (Dolphin, AdsPower, another Chrome
//      profile...). The authorization happens with that browser's own IP
//      and session; at the end it shows the public page /connected.
// Used by ConnectInstagramButton (connect) and AccountStatus (reconnect).

function mmss(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ConnectChoiceModal({ onClose, title = 'Conectar com o Instagram' }) {
  const [busy, setBusy] = useState(null); // 'here' | 'link'
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null); // { url, expiresAt }
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  useEffect(() => {
    if (!link) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [link]);

  const left = link ? new Date(link.expiresAt).getTime() - now : 0;
  const expired = Boolean(link) && left <= 0;

  const openHere = async () => {
    setBusy('here');
    setError(null);
    try {
      const url = await getAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar a conexão.');
      setBusy(null);
    }
  };

  const copy = async (url) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch (_) {
      // Fallback: select the text so Ctrl+C works.
      inputRef.current?.select();
      try {
        ok = document.execCommand('copy');
      } catch (__) {
        ok = false;
      }
    }
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  const makeLink = async () => {
    setBusy('link');
    setError(null);
    setCopied(false);
    try {
      const data = await getAuthorizeLink({ external: true });
      setLink(data);
      setNow(Date.now());
      await copy(data.url);
    } catch (err) {
      setError(err.message || 'Não foi possível gerar o link.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sf-batch-modal__overlay" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="sf-batch-modal sf-connect-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sf-batch-modal__header">
          <h3 className="sf-batch-modal__title">{title}</h3>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={onClose} disabled={Boolean(busy)}>
            Fechar
          </button>
        </div>

        {!link && (
          <>
            <p className="sf-connect-modal__question">Como você quer abrir a autorização?</p>
            <button type="button" className="sf-button sf-button--primary sf-connect-modal__option" onClick={openHere} disabled={Boolean(busy)}>
              {busy === 'here' ? 'Abrindo Instagram...' : 'Abrir aqui (nesta aba)'}
            </button>
            <button type="button" className="sf-button sf-button--secondary sf-connect-modal__option" onClick={makeLink} disabled={Boolean(busy)}>
              {busy === 'link' ? 'Gerando link...' : 'Copiar link (multilogin)'}
            </button>
            <p className="sf-field-hint sf-connect-modal__note">
              Use "Copiar link" para autorizar pelo navegador do próprio perfil (Dolphin, AdsPower ou outro perfil do Chrome). O
              link vale por 5 minutos e funciona uma vez só.
            </p>
          </>
        )}

        {link && (
          <div className="sf-connect-link">
            <label className="sf-field-hint" htmlFor="sf-connect-url">
              {copied ? '✓ Link copiado' : 'Link de autorização'}
            </label>
            <div className="sf-connect-link__row">
              <input
                id="sf-connect-url"
                ref={inputRef}
                className="sf-input"
                readOnly
                value={expired ? '' : link.url}
                placeholder="Link expirado"
                onFocus={(e) => e.target.select()}
              />
              <button type="button" className="sf-button sf-button--primary sf-button--small" onClick={() => copy(link.url)} disabled={expired}>
                Copiar
              </button>
            </div>
            <p className={`sf-connect-link__timer${expired ? ' is-expired' : left < 60000 ? ' is-ending' : ''}`}>
              {expired ? 'Link expirado.' : `Expira em ${mmss(left)}`}
            </p>
            <ol className="sf-connect-link__steps">
              <li>Cole o link no navegador do perfil (Dolphin, AdsPower...).</li>
              <li>Entre no Instagram desse perfil, se pedir, e clique em "Permitir".</li>
              <li>Quando aparecer "Perfil conectado", volte aqui e clique em "Já autorizei".</li>
            </ol>
            <div className="sf-batch-modal__actions">
              <button type="button" className="sf-button sf-button--secondary" onClick={makeLink} disabled={Boolean(busy)}>
                {busy === 'link' ? 'Gerando...' : 'Gerar novo link'}
              </button>
              <button type="button" className="sf-button sf-button--primary" onClick={() => window.location.reload()}>
                Já autorizei — atualizar
              </button>
            </div>
          </div>
        )}

        {error && <p className="sf-field-hint sf-field-hint--error">{error}</p>}
      </div>
    </div>
  );
}