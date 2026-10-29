// Rodada 4.1: simple previous/next pagination with "X–Y de Z".
export default function Pagination({ page, pageSize, total, onChange, disabled = false }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 0) return null;

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="sf-pagination" aria-label="Paginação">
      <button
        type="button"
        className="sf-button sf-button--secondary sf-button--small"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page === 0}
      >
        ← Anterior
      </button>
      <span className="sf-pagination__info">
        {from}–{to} de {total} · página {page + 1} de {totalPages}
      </span>
      <button
        type="button"
        className="sf-button sf-button--secondary sf-button--small"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page + 1 >= totalPages}
      >
        Próxima →
      </button>
    </nav>
  );
}