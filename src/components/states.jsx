import '../styles/states.css';

export function LoadingState({ message = 'Carregando...' }) {
  return (
    <div className="sf-state sf-state--loading">
      <span className="sf-spinner" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Algo deu errado.', onRetry }) {
  return (
    <div className="sf-state sf-state--error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="sf-button sf-button--secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'Nenhum item encontrado.' }) {
  return (
    <div className="sf-state sf-state--empty">
      <p>{message}</p>
    </div>
  );
}
