import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { useAccountFolders } from '../hooks/useAccountFolders.js';
import * as templatesService from '../services/templatesService.js';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import '../styles/templates.css';

// Rodada 16: /templates — "Modelos".
// A template = name + type (or any) + default caption + hashtag set +
// destination folder. "Usar" opens Novo post already filled (in batch mode
// with the folder's profiles when the template has a folder).

const TYPES = ['REEL', 'FEED_VIDEO', 'FEED_IMAGE', 'FEED_CAROUSEL', 'STORY'];
const CAPTION_MAX = 2200;
const HASHTAGS_MAX = 30;
const EMPTY = { name: '', type: '', caption: '', hashtags: '', accountFolderId: '' };

// Same rules as the backend, for live feedback while typing.
export function previewHashtags(text) {
  const seen = new Set();
  const out = [];
  const bad = [];
  for (const piece of String(text || '').split(/[\s,;]+/)) {
    const word = piece.replace(/^#+/, '').trim();
    if (!word) continue;
    if (!/^[\p{L}\p{N}_]+$/u.test(word)) {
      bad.push(`#${word}`);
      continue;
    }
    if (seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    out.push(`#${word}`);
  }
  return { tags: out, bad };
}

function finalText(caption, tags) {
  return [String(caption || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
}

export default function Templates() {
  const [state, setState] = useState({ status: 'loading', templates: [], error: null });
  const [form, setForm] = useState(null); // null = closed; { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const { folders } = useAccountFolders();

  const load = useCallback(async () => {
    try {
      const { templates } = await templatesService.listTemplates();
      setState({ status: 'success', templates: templates || [], error: null });
    } catch (err) {
      setState({ status: 'error', templates: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hashtagInfo = useMemo(() => previewHashtags(form?.hashtags), [form?.hashtags]);
  const fullCaption = form ? finalText(form.caption, hashtagInfo.tags) : '';
  const tooLong = fullCaption.length > CAPTION_MAX;
  const tooManyTags = hashtagInfo.tags.length > HASHTAGS_MAX;

  const edit = (t) =>
    setForm({
      id: t.id,
      name: t.name,
      type: t.type || '',
      caption: t.caption || '',
      hashtags: t.hashtags || '',
      accountFolderId: t.folder?.id || '',
    });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      type: form.type || null,
      caption: form.caption || null,
      hashtags: form.hashtags || null,
      accountFolderId: form.accountFolderId || null,
    };
    try {
      if (form.id) await templatesService.updateTemplate(form.id, body);
      else await templatesService.createTemplate(body);
      setToast({ tone: 'success', message: form.id ? '✓ Modelo atualizado.' : '✓ Modelo criado.' });
      setForm(null);
      load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Excluir o modelo "${t.name}"? Os posts já criados com ele não mudam.`)) return;
    try {
      await templatesService.deleteTemplate(t.id);
      setToast({ tone: 'success', message: '✓ Modelo excluído.' });
      load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Modelos</h1>
            <p className="sf-page-head__subtitle">
              Legenda, hashtags, tipo e pasta de destino prontos. No Novo post, é só escolher o modelo e a mídia.
            </p>
          </div>
          {!form && (
            <div className="sf-page-head__actions">
              <button type="button" className="sf-button sf-button--primary" onClick={() => setForm({ ...EMPTY })}>
                + Novo modelo
              </button>
            </div>
          )}
        </div>

        {form && (
          <form className="sf-tpl-form" onSubmit={save}>
            <h2 className="sf-tpl-form__title">{form.id ? 'Editar modelo' : 'Novo modelo'}</h2>
            <div className="sf-tpl-form__grid">
              <label className="sf-tpl-field">
                <span className="sf-field-label">Nome</span>
                <input className="sf-tpl-input" value={form.name} onChange={set('name')} maxLength={60} placeholder="Ex.: Meme engraçado" required />
              </label>
              <label className="sf-tpl-field">
                <span className="sf-field-label">Tipo de post</span>
                <select className="sf-select" value={form.type} onChange={set('type')}>
                  <option value="">Qualquer tipo</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {POST_TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sf-tpl-field">
                <span className="sf-field-label">Pasta de destino (vários perfis)</span>
                <select className="sf-select" value={form.accountFolderId} onChange={set('accountFolderId')}>
                  <option value="">Nenhuma</option>
                  {(folders || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="sf-tpl-field">
              <span className="sf-field-label">Legenda padrão</span>
              <textarea className="sf-tpl-input sf-tpl-textarea" rows={4} value={form.caption} onChange={set('caption')} placeholder="Texto que vai em todo post deste modelo" />
              <span className="sf-field-hint">
                No modo "vários perfis" dá para variar o texto: {'{Oi|Olá|E aí}'} escolhe uma opção diferente por perfil.
              </span>
            </label>
            <label className="sf-tpl-field">
              <span className="sf-field-label">
                Hashtags <span className={tooManyTags ? 'is-bad' : ''}>({hashtagInfo.tags.length}/{HASHTAGS_MAX})</span>
              </span>
              <textarea className="sf-tpl-input sf-tpl-textarea" rows={2} value={form.hashtags} onChange={set('hashtags')} placeholder="memes humor viral (o # é opcional)" />
              {hashtagInfo.tags.length > 0 && (
                <span className="sf-tpl-tags">
                  {hashtagInfo.tags.map((t) => (
                    <span key={t} className="sf-tpl-tag">
                      {t}
                    </span>
                  ))}
                </span>
              )}
              {hashtagInfo.bad.length > 0 && (
                <span className="sf-field-hint sf-field-hint--error">
                  Inválidas (só letras, números e _): {hashtagInfo.bad.join(' ')}
                </span>
              )}
            </label>
            {fullCaption && (
              <div className="sf-tpl-preview">
                <span className="sf-field-label">
                  Como fica no post <span className={tooLong ? 'is-bad' : ''}>({fullCaption.length}/{CAPTION_MAX})</span>
                </span>
                <p>{fullCaption}</p>
              </div>
            )}
            <div className="sf-tpl-form__actions">
              <button type="button" className="sf-button sf-button--secondary" onClick={() => setForm(null)} disabled={saving}>
                Cancelar
              </button>
              <button
                type="submit"
                className="sf-button sf-button--primary"
                disabled={saving || !form.name.trim() || tooLong || tooManyTags || hashtagInfo.bad.length > 0}
              >
                {saving ? 'Salvando...' : 'Salvar modelo'}
              </button>
            </div>
          </form>
        )}

        {state.status === 'loading' && <LoadingState message="Carregando modelos..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}
        {state.status === 'success' && state.templates.length === 0 && !form && (
          <div className="sf-sched-empty">
            <p className="sf-sched-empty__title">Nenhum modelo ainda.</p>
            <p className="sf-field-hint">
              Crie um modelo com a legenda e as hashtags que você mais usa. Também dá para salvar direto do Novo post.
            </p>
          </div>
        )}

        <div className="sf-tpl-grid">
          {state.templates.map((t) => (
            <article key={t.id} className="sf-tpl-card">
              <div className="sf-tpl-card__head">
                <strong>{t.name}</strong>
                <span className="sf-tpl-card__uses">{t.usageCount ? `usado ${t.usageCount}x` : 'nunca usado'}</span>
              </div>
              <div className="sf-tpl-card__chips">
                <span className="sf-tpl-chip">{t.type ? POST_TYPE_LABELS[t.type] || t.type : 'Qualquer tipo'}</span>
                {t.folder && <span className="sf-tpl-chip">Pasta {t.folder.name} · {t.folder.accountIds.length} perfil(is)</span>}
                {t.hashtagCount > 0 && <span className="sf-tpl-chip">{t.hashtagCount} hashtag(s)</span>}
              </div>
              {t.finalCaption ? <p className="sf-tpl-card__caption">{t.finalCaption}</p> : <p className="sf-field-hint">Sem legenda</p>}
              <div className="sf-tpl-card__actions">
                <Link className="sf-button sf-button--primary sf-button--small" to={`/posts/new?template=${t.id}`}>
                  Usar (1 perfil)
                </Link>
                {t.folder && t.folder.accountIds.length > 0 && (
                  <Link className="sf-button sf-button--secondary sf-button--small" to={`/posts/new?template=${t.id}&mode=batch`}>
                    Usar na pasta
                  </Link>
                )}
                <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => edit(t)}>
                  Editar
                </button>
                <button type="button" className="sf-button sf-button--danger sf-button--small" onClick={() => remove(t)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}