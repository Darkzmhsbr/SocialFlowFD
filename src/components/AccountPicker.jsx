import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';

// Dropdown of Instagram accounts owned by the current user. Only ACTIVE
// accounts are selectable - anything else (TOKEN_EXPIRED, REVOKED, ERROR)
// would fail at publish time anyway.
export default function AccountPicker({ value, onChange, disabled = false }) {
  const { status, accounts, error } = useInstagramAccounts();

  if (status === 'loading') {
    return <p className="sf-field-hint">Carregando contas...</p>;
  }

  if (status === 'error') {
    return <p className="sf-field-hint sf-field-hint--error">Erro ao carregar contas: {error}</p>;
  }

  const usableAccounts = accounts.filter((a) => a.status === 'ACTIVE');

  if (usableAccounts.length === 0) {
    return (
      <p className="sf-field-hint sf-field-hint--error">
        Nenhuma conta Instagram ativa. Conecte uma conta no Dashboard antes de agendar posts.
      </p>
    );
  }

  return (
    <div className="sf-account-picker">
      <label className="sf-field-label" htmlFor="post-account">
        Conta do Instagram
      </label>
      <select
        id="post-account"
        className="sf-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          Selecione uma conta...
        </option>
        {usableAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            @{account.username}
            {account.name ? ` — ${account.name}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}