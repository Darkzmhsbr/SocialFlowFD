// Rodada 4: switch between the original single-post composer and the
// multi-profile batch composer. Only shown when CREATING a post — editing
// always works on one post (posts of a batch are edited individually).
export default function PublishModeToggle({ value, onChange, disabled = false }) {
  return (
    <div className="sf-mode-toggle" role="radiogroup" aria-label="Modo de publicação">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'single'}
        className={`sf-mode-toggle__option${value === 'single' ? ' is-active' : ''}`}
        onClick={() => onChange('single')}
        disabled={disabled}
      >
        <strong>Um perfil</strong>
        <span>Um post em uma conta, como sempre</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'batch'}
        className={`sf-mode-toggle__option${value === 'batch' ? ' is-active' : ''}`}
        onClick={() => onChange('batch')}
        disabled={disabled}
      >
        <strong>Vários perfis</strong>
        <span>Várias mídias publicadas em vários perfis de uma vez</span>
      </button>
    </div>
  );
}