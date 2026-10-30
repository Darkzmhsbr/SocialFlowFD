import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import * as invitesService from '../services/invitesService.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/accounts.css';
import '../styles/invites.css';

// Rodada 11: /invites — admin only. Generate single-use invite codes,
// copy the ready-to-send link + instructions, follow pending/used/expired.

const STATUS = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  USED: { label: 'Usado', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'error' },
};

const FILTERS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'USED', label: 'Usados' },
  { key: 'EXPIRED', label: 'Expirados' },
];

function registerLink(code) {
  return `${window.location.origin}/register?code=${code}`;
}

function instructionsText(code, note) {
  const link = registerLink(code);
  return `Olá${note ? `, ${note}` : ''}! Seu acesso ao SocialFlow:

1) CRIAR SUA CONTA
Abra: ${link}
Preencha nome, e-mail e uma senha (mínimo 8 caracteres). O código já vem preenchido e vale para um único cadastro.

2) PREPARAR OS PERFIS DO INSTAGRAM
- Cada perfil precisa ser conta profissional (Comercial ou Criador): Instagram › Configurações › Tipo de conta.
- O perfil não pode ter restrições (Configurações › Status da conta).

3) SEU APP DA META (recomendado)
No SocialFlow, abra o menu "App Meta" e siga o passo a passo: crie o app em developers.facebook.com, cole a URL de retorno mostrada na página e salve o ID e a chave secreta do APP DO INSTAGRAM (não os do app principal).

4) LIBERAR CADA PERFIL COMO TESTADOR
- No painel do seu app: Funções do app › Funções › Adicionar pessoas › Testador do Instagram › @ do perfil.
- No Instagram do perfil: Configurações › Apps e sites › Convites de testador › Aceitar.

5) CONECTAR
- No mesmo navegador, entre em instagram.com logado no perfil que quer conectar.
- No SocialFlow: Contas › + Conectar Instagram › Permitir.
- Um perfil por vez: troque a conta logada no instagram.com e repita.

6) BOAS PRÁTICAS
- Ao postar em vários perfis, deixe "Escalonar as publicações" ligado.
- Evite dezenas de Reels seguidos no mesmo perfil; perfis novos: comece devagar.`;
}

export default function Invites() {
  const [state, setState] = useState('loading');
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [note, setNote] = useState('');
  const [expires, setExpires] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const { invites: list } = await invitesService.listAllInvites();
      setInvites(list || []);
      setState('success');
    } catch (err) {
      setError(err.status === 403 ? 'Acesso restrito ao administrador da plataforma.' : err.message);
      setState(err.status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { ALL: invites.length, PENDING: 0, USED: 0, EXPIRED: 0 };
    invites.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [invites]);

  const visible = filter === 'ALL' ? invites : invites.filter((i) => i.status === filter);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 2000);
    } catch {
      setToast({ tone: 'error', message: 'Não foi possível copiar. Selecione o texto e copie manualmente.' });
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const body = { note: note.trim() || undefined };
      if (expires) body.expiresInDays = Number(expires);
      const { invite } = await invitesService.createInvite(body);
      setCreated(invite);
      setNote('');
      setToast({ tone: 'success', message: `✓ Convite ${invite.code} gerado.` });
      load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (invite) => {
    if (!window.confirm(`Revogar o convite ${invite.code}${invite.note ? ` (${invite.note})` : ''}? O link deixa de funcionar.`)) return;
    try {
      await invitesService.revokeInvite(invite.id);
      setToast({ tone: 'success', message: '✓ Convite revogado.' });
      if (created?.id === invite.id) setCreated(null);
      load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Convites</h1>
            <p className="sf-page-head__subtitle">Gere acessos para novos usuários. Cada código vale para um único cadastro.</p>
          </div>
        </div>

        {state === 'loading' && <LoadingState message="Carregando convites..." />}
        {state === 'forbidden' && <div className="sf-invite-forbidden">{error}</div>}
        {state === 'error' && <ErrorState message={error} onRetry={load} />}

        {state === 'success' && (
          <>
            <form className="sf-invite-card" onSubmit={create}>
              <h2 className="sf-invite-card__title">Gerar convite</h2>
              <div className="sf-invite-form">
                <label className="sf-invite-form__field">
                  <span className="sf-field-label">Para quem (opcional)</span>
                  <input
                    className="sf-invite-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: Sócio 2 — João"
                    maxLength={80}
                  />
                </label>
                <label className="sf-invite-form__field sf-invite-form__field--small">
                  <span className="sf-field-label">Validade</span>
                  <select className="sf-select" value={expires} onChange={(e) => setExpires(e.target.value)}>
                    <option value="">Sem validade</option>
                    <option value="1">1 dia</option>
                    <option value="7">7 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </label>
                <button type="submit" className="sf-button sf-button--primary sf-invite-form__submit" disabled={creating}>
                  {creating ? 'Gerando...' : 'Gerar convite'}
                </button>
              </div>

              {created && (
                <div className="sf-invite-created">
                  <div className="sf-invite-created__code">
                    <span className="sf-field-label">Código{created.note ? ` · ${created.note}` : ''}</span>
                    <strong>{created.code}</strong>
                  </div>
                  <code className="sf-invite-created__link">{registerLink(created.code)}</code>
                  <div className="sf-invite-created__actions">
                    <button
                      type="button"
                      className="sf-button sf-button--primary sf-button--small"
                      onClick={() => copy(registerLink(created.code), 'new-link')}
                    >
                      {copied === 'new-link' ? '✓ Link copiado' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      className="sf-button sf-button--secondary sf-button--small"
                      onClick={() => copy(instructionsText(created.code, created.note), 'new-text')}
                    >
                      {copied === 'new-text' ? '✓ Instruções copiadas' : 'Copiar link + instruções'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="sf-chips sf-invite-filters" role="tablist" aria-label="Filtrar convites">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`sf-chip${filter === f.key ? ' is-active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} ({counts[f.key] || 0})
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="sf-field-hint">Nenhum convite aqui.</p>
            ) : (
              <ul className="sf-invite-list">
                {visible.map((inv) => {
                  const s = STATUS[inv.status] || STATUS.PENDING;
                  return (
                    <li key={inv.id} className="sf-invite-row">
                      <div className="sf-invite-row__main">
                        <div className="sf-invite-row__top">
                          <code className="sf-invite-row__code">{inv.code}</code>
                          <span className={`sf-pill sf-pill--${s.tone}`}>{s.label}</span>
                          {inv.note && <span className="sf-invite-row__note">{inv.note}</span>}
                        </div>
                        <p className="sf-invite-row__meta">
                          Criado em {formatDateTime(inv.createdAt)}
                          {inv.expiresAt && inv.status !== 'USED' ? ` · expira em ${formatDateTime(inv.expiresAt)}` : ''}
                          {inv.status === 'USED' && inv.usedBy
                            ? ` · usado por ${inv.usedBy.name ? `${inv.usedBy.name} (${inv.usedBy.email})` : inv.usedBy.email}${
                                inv.usedAt ? ` em ${formatDateTime(inv.usedAt)}` : ''
                              }`
                            : ''}
                        </p>
                      </div>
                      {inv.status === 'PENDING' && (
                        <div className="sf-invite-row__actions">
                          <button
                            type="button"
                            className="sf-button sf-button--secondary sf-button--small"
                            onClick={() => copy(registerLink(inv.code), inv.id)}
                          >
                            {copied === inv.id ? '✓ Copiado' : 'Copiar link'}
                          </button>
                          <button
                            type="button"
                            className="sf-button sf-button--secondary sf-button--small"
                            onClick={() => copy(instructionsText(inv.code, inv.note), `${inv.id}-t`)}
                          >
                            {copied === `${inv.id}-t` ? '✓ Copiado' : 'Instruções'}
                          </button>
                          <button
                            type="button"
                            className="sf-button sf-button--danger sf-button--small"
                            onClick={() => revoke(inv)}
                          >
                            Revogar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}