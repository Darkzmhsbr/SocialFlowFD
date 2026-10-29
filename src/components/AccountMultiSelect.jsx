import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import { BATCH_LIMITS } from '../utils/postConstants.js';

// Rodada 4: checkbox list of the user's Instagram accounts for the batch
// composer. Same data source and ACTIVE-only rule as AccountPicker —
// inactive accounts are listed but disabled, so the user sees why a
// profile can't be picked instead of it silently disappearing.
export default function AccountMultiSelect({ value = [], onChange, disabled = false }) {
  const { status, accounts, error } = useInstagramAccounts();

  if (status === 'loading') {
    return <p className="sf-field-hint">Carregando contas...</p>;
  }

  if (status === 'error') {
    return <p className="sf-field-hint sf-field-hint--error">Erro ao carregar contas: {error}</p>;
  }

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const inactiveAccounts = accounts.filter((a) => a.status !== 'ACTIVE');

  if (activeAccounts.length === 0) {
    return (
      <p className="sf-field-hint sf-field-hint--error">
        Nenhuma conta Instagram ativa. Conecte uma conta no Dashboard antes de agendar posts.
      </p>
    );
  }

  const activeIds = new Set(activeAccounts.map((a) => a.id));
  // Ignore ids of accounts that stopped being ACTIVE since they were picked.
  const selected = new Set(value.filter((id) => activeIds.has(id)));
  const atLimit = selected.size >= BATCH_LIMITS.maxAccounts;
  const allSelected = activeAccounts.every((a) => selected.has(a.id));

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (atLimit) return;
      next.add(id);
    }
    onChange([...next]);
  };

  const selectAll = () => {
    onChange(activeAccounts.slice(0, BATCH_LIMITS.maxAccounts).map((a) => a.id));
  };

  const clearAll = () => onChange([]);

  return (
    <div className="sf-account-multi">
      <div className="sf-account-multi__header">
        <span className="sf-field-label">
          {`${selected.size} de ${activeAccounts.length} ${activeAccounts.length === 1 ? 'perfil' : 'perfis'} selecionado${
            selected.size === 1 ? '' : 's'
          }`}
        </span>
        <div className="sf-account-multi__bulk">
          <button
            type="button"
            className="sf-button sf-button--secondary sf-button--small"
            onClick={selectAll}
            disabled={disabled || allSelected}
          >
            Selecionar todos
          </button>
          <button
            type="button"
            className="sf-button sf-button--secondary sf-button--small"
            onClick={clearAll}
            disabled={disabled || selected.size === 0}
          >
            Limpar
          </button>
        </div>
      </div>

      <ul className="sf-account-multi__list">
        {activeAccounts.map((account) => {
          const isSelected = selected.has(account.id);
          const blocked = !isSelected && atLimit;
          return (
            <li key={account.id}>
              <label
                className={`sf-account-multi__item${isSelected ? ' is-selected' : ''}${
                  blocked ? ' is-blocked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(account.id)}
                  disabled={disabled || blocked}
                />
                <AccountAvatar account={account} />
                <span className="sf-account-multi__names">
                  <span className="sf-account-multi__username">@{account.username}</span>
                  {account.name && <span className="sf-account-multi__name">{account.name}</span>}
                </span>
              </label>
            </li>
          );
        })}

        {inactiveAccounts.map((account) => (
          <li key={account.id}>
            <div className="sf-account-multi__item is-inactive" title="Reconecte esta conta para usá-la">
              <input type="checkbox" disabled />
              <AccountAvatar account={account} />
              <span className="sf-account-multi__names">
                <span className="sf-account-multi__username">@{account.username}</span>
                <span className="sf-account-multi__name">Inativa ({account.status}) — reconecte no Dashboard</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {atLimit && (
        <p className="sf-field-hint">Limite de {BATCH_LIMITS.maxAccounts} perfis por lote atingido.</p>
      )}
    </div>
  );
}

function AccountAvatar({ account }) {
  if (account.profilePictureUrl) {
    return <img className="sf-account-multi__avatar" src={account.profilePictureUrl} alt="" />;
  }
  return (
    <span className="sf-account-multi__avatar sf-account-multi__avatar--initial" aria-hidden="true">
      {(account.username || '?').charAt(0).toUpperCase()}
    </span>
  );
}