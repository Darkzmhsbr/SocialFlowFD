import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';

// Rodada 4.1: "filter by profile" dropdown for the /posts page. Lists
// every account of the user (inactive ones too — their posts still exist).
export default function AccountFilterSelect({ value, onChange, disabled = false }) {
  const { status, accounts } = useInstagramAccounts();

  if (status !== 'success' || accounts.length < 2) return null;

  return (
    <label className="sf-posts-filter">
      <span className="sf-field-label">Perfil</span>
      <select
        className="sf-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">Todos os perfis</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            @{account.username}
            {account.status !== 'ACTIVE' ? ' (inativa)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}