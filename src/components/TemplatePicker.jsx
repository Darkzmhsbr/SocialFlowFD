import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as templatesService from '../services/templatesService.js';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import '../styles/templates.css';

// Rodada 16: "Usar modelo" button for the composers.
//   onApply(template)  - the composer decides what to fill
//   autoApplyId        - applies that template once, as soon as it loads
//                        (link "Usar" on the Modelos page)
//   current            - { type, caption } for "Salvar como modelo"
export default function TemplatePicker({ onApply, autoApplyId = null, current = null, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', templates: [], error: null });
  const [q, setQ] = useState('');
  const [note, setNote] = useState(null);
  const boxRef = useRef(null);
  const autoDone = useRef(false);

  const load = async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const { templates } = await templatesService.listTemplates();
      setState({ status: 'success', templates: templates || [], error: null });
      return templates || [];
    } catch (err) {
      setState({ status: 'error', templates: [], error: err.message });
      return [];
    }
  };

  const apply = (t) => {
    setOpen(false);
    onApply(t);
    templatesService.markTemplateUsed(t.id).catch(() => {});
  };

  useEffect(() => {
    if (!autoApplyId || autoDone.current) return;
    autoDone.current = true;
    load().then((list) => {
      const t = list.find((x) => x.id === autoApplyId);
      if (t) apply(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApplyId]);

  useEffect(() => {
    if (!open) return undefined;
    if (state.status === 'idle') load();
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveCurrent = async () => {
    const name = window.prompt('Nome do novo modelo:');
    if (!name || !name.trim()) return;
    try {
      await templatesService.createTemplate({ name, type: current?.type || null, caption: current?.caption || null });
      setNote(`✓ Modelo "${name.trim()}" salvo.`);
      load();
    } catch (err) {
      setNote(err.message);
    }
  };

  const term = q.trim().toLowerCase();
  const list = state.templates.filter(
    (t) => !term || t.name.toLowerCase().includes(term) || (t.finalCaption || '').toLowerCase().includes(term)
  );

  return (
    <div className="sf-tpl-picker" ref={boxRef}>
      <button
        type="button"
        className="sf-button sf-button--secondary"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
      >
        Usar modelo ▾
      </button>
      {open && (
        <div className="sf-tpl-picker__pop" role="dialog" aria-label="Modelos">
          {state.templates.length > 6 && (
            <input
              className="sf-tpl-picker__search"
              placeholder="Buscar modelo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          )}
          {state.status === 'loading' && <p className="sf-field-hint">Carregando...</p>}
          {state.status === 'error' && <p className="sf-field-hint sf-field-hint--error">{state.error}</p>}
          {state.status === 'success' && state.templates.length === 0 && (
            <p className="sf-field-hint">Você ainda não tem modelos.</p>
          )}
          <ul className="sf-tpl-picker__list">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" className="sf-tpl-picker__item" onClick={() => apply(t)}>
                  <strong>{t.name}</strong>
                  <span className="sf-tpl-picker__meta">
                    {t.type ? POST_TYPE_LABELS[t.type] || t.type : 'Qualquer tipo'}
                    {t.folder ? ` · pasta ${t.folder.name}` : ''}
                    {t.hashtagCount ? ` · ${t.hashtagCount} hashtag(s)` : ''}
                  </span>
                  {t.finalCaption && <span className="sf-tpl-picker__preview">{t.finalCaption}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="sf-tpl-picker__foot">
            {current && (current.caption || '').trim() && (
              <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={saveCurrent}>
                Salvar legenda atual como modelo
              </button>
            )}
            <Link className="sf-button sf-button--secondary sf-button--small" to="/templates">
              Gerenciar modelos
            </Link>
          </div>
          {note && <p className="sf-field-hint">{note}</p>}
        </div>
      )}
    </div>
  );
}