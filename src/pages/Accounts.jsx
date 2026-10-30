import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import ConnectInstagramButton from '../components/ConnectInstagramButton.jsx';
import InstagramAccountCard from '../components/InstagramAccountCard.jsx';
import AccountHealthBanner from '../components/AccountHealthBanner.jsx';
import Toast from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/states.jsx';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import { readAndClearParam } from '../utils/queryParams.js';
import '../styles/accounts.css';

// Rodada 6: /accounts — every connected Instagram profile, with search,
// health filter, connect / manage / disconnect.
const CALLBACK_MESSAGES = {
  connected: { tone: 'success', message: '✓ Instagram conectado com sucesso.' },
  denied: { tone: 'error', message: 'A autorização foi cancelada. Nenhuma conta foi conectada.' },
  error: { tone: 'error', message: 'Não foi possível conectar a conta. Tente novamente.' },
};

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'paused', label: 'Em pausa' },
  { key: 'problem', label: 'Com problema' },
];

export function classifyAccount(account, now = Date.now()) {
  if (account.status && account.status !== 'ACTIVE') return 'problem';
  if (account.publishPausedUntil && new Date(account.publishPausedUntil).getTime() > now) return 'paused';
  return 'active';
}

export default function Accounts() {
  const { status, accounts, error, reload, disconnect } = useInstagramAccounts();
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const info = CALLBACK_MESSAGES[readAndClearParam('instagram')];
    if (info) {
      setToast(info);
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { all: accounts.length, active: 0, paused: 0, problem: 0 };
    for (const a of accounts) c[classifyAccount(a)] += 1;
    return c;
  }, [accounts]);

  const visible = useMemo(() => {
    const term = query.trim().replace(/^@/, '').toLowerCase();
    return accounts.filter((a) => {
      if (filter !== 'all' && classifyAccount(a) !== filter) return false;
      if (!term) return true;
      return (a.username || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term);
    });
  }, [accounts, query, filter]);

  const handleDisconnect = async (id) => {
    try {
      await disconnect(id);
      setToast({ tone: 'success', message: '✓ Conta desconectada.' });
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
            <h1 className="sf-page-head__title">Contas</h1>
            <p className="sf-page-head__subtitle">Perfis do Instagram conectados ao SocialFlow.</p>
          </div>
          <div className="sf-page-head__actions">
            <ConnectInstagramButton />
          </div>
        </div>

        {status === 'loading' && <LoadingState message="Carregando contas..." />}
        {status === 'error' && <ErrorState message={error} onRetry={reload} />}

        {status === 'success' && accounts.length === 0 && (
          <div className="sf-accounts-empty">
            <EmptyState message="Nenhuma conta conectada ainda." />
            <p className="sf-field-hint">
              Use “+ Conectar Instagram” estando logado, neste navegador, no perfil que deseja conectar. No modo de
              testes da Meta, o perfil precisa ter aceitado o convite de testador do app.
            </p>
          </div>
        )}

        {status === 'success' && accounts.length > 0 && (
          <>
            <div className="sf-accounts-stats">
              <StatTile label="Conectadas" value={counts.all} />
              <StatTile label="Ativas" value={counts.active} tone="success" />
              <StatTile label="Em pausa" value={counts.paused} tone="warning" />
              <StatTile label="Com problema" value={counts.problem} tone="error" />
            </div>

            <AccountHealthBanner accounts={accounts} />

            <div className="sf-accounts-toolbar">
              <label className="sf-search">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  className="sf-search__input"
                  placeholder="Buscar por @usuário ou nome..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="sf-chips" role="tablist" aria-label="Filtrar contas">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={`sf-chip${filter === f.key ? ' is-active' : ''}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label} ({counts[f.key]})
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState message="Nenhuma conta com esse filtro." />
            ) : (
              <div className="sf-account-list">
                {visible.map((account) => (
                  <InstagramAccountCard key={account.id} account={account} onDisconnect={handleDisconnect} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function StatTile({ label, value, tone }) {
  return (
    <div className={`sf-stat-tile${tone ? ` sf-stat-tile--${tone}` : ''}`}>
      <span className="sf-stat-tile__value">{value}</span>
      <span className="sf-stat-tile__label">{label}</span>
    </div>
  );
}