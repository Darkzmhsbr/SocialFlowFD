import { useAccountFolders } from '../hooks/useAccountFolders.js';

// Rodada 8: "Pasta" dropdown filter (Agendamentos, Contas). Hidden when the
// user has no folders.
export default function AccountFolderFilter({ value, onChange, disabled = false }) {
  const { status, folders } = useAccountFolders();
  if (status !== 'success' || folders.length === 0) return null;

  return (
    <label className="sf-posts-filter">
      <span className="sf-field-label">Pasta</span>
      <select
        className="sf-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">Todas as pastas</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.count})
          </option>
        ))}
      </select>
    </label>
  );
}