import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import '../styles/accountFolders.css';

// Rodada 8: create a folder / edit which profiles are in it.
//   mode 'create': name + profiles
//   mode 'edit'  : profiles only (rename is a separate action)
export default function FolderMembersModal({ mode = 'edit', folder, accounts, onSave, onClose }) {
  const [name, setName] = useState(folder?.name || '');
  const [selected, setSelected] = useState(() => new Set(folder?.accountIds || []));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const visible = useMemo(() => {
    const term = query.trim().replace(/^@/, '').toLowerCase();
    if (!term) return accounts;
    return accounts.filter(
      (a) => (a.username || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term)
    );
  }, [accounts, query]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((a) => selected.has(a.id));
  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((a) => (allVisibleSelected ? next.delete(a.id) : next.add(a.id)));
      return next;
    });

  const submit = async () => {
    if (mode === 'create' && !name.trim()) {
      setError('Dê um nome para a pasta.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), accountIds: [...selected] });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="sf-batch-modal__overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="sf-batch-modal sf-folder-modal" role="dialog" aria-modal="true" aria-label="Perfis da pasta">
        <div className="sf-batch-modal__header">
          <div>
            <h3 className="sf-batch-modal__title">
              {mode === 'create' ? 'Nova pasta de perfis' : `Perfis em “${folder?.name}”`}
            </h3>
            <p className="sf-field-hint">{selected.size} perfil(is) selecionado(s)</p>
          </div>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        {mode === 'create' && (
          <label className="sf-folder-modal__name">
            <span className="sf-field-label">Nome da pasta</span>
            <input
              className="sf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Memes"
              maxLength={60}
              autoFocus
            />
          </label>
        )}

        <div className="sf-folder-modal__bar">
          <label className="sf-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              className="sf-search__input"
              placeholder="Buscar perfil..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={toggleVisible} disabled={visible.length === 0}>
            {allVisibleSelected ? 'Desmarcar visíveis' : 'Marcar visíveis'}
          </button>
        </div>

        <ul className="sf-folder-modal__list">
          {visible.map((a) => (
            <li key={a.id}>
              <label className={`sf-account-multi__item${selected.has(a.id) ? ' is-selected' : ''}`}>
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                {a.profilePictureUrl ? (
                  <img className="sf-account-multi__avatar" src={a.profilePictureUrl} alt="" />
                ) : (
                  <span className="sf-account-multi__avatar sf-account-multi__avatar--initial">
                    {(a.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="sf-account-multi__names">
                  <span className="sf-account-multi__username">@{a.username}</span>
                  {a.status !== 'ACTIVE' && <span className="sf-account-multi__name">Com problema ({a.status})</span>}
                </span>
              </label>
            </li>
          ))}
          {visible.length === 0 && <li className="sf-field-hint">Nenhum perfil encontrado.</li>}
        </ul>

        {error && <p className="sf-field-hint sf-field-hint--error">{error}</p>}

        <div className="sf-batch-modal__actions">
          <button type="button" className="sf-button sf-button--primary" onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : mode === 'create' ? 'Criar pasta' : 'Salvar perfis'}
          </button>
        </div>
      </div>
    </div>
  );
}