import { toDateTimeLocalValue } from '../utils/formatDate.js';

// Wraps <input type="datetime-local"> so the composer can toggle between
// "publish later" (value present) and "save as draft" (value cleared).
// Uses the browser's native picker on both desktop and mobile - no lib.
export default function ScheduleDateTimePicker({ value, onChange, disabled = false }) {
  const localValue = value ? toDateTimeLocalValue(value) : '';

  const handleChange = (e) => {
    const raw = e.target.value;
    if (!raw) {
      onChange(null);
      return;
    }
    // datetime-local returns "YYYY-MM-DDTHH:mm" without timezone. new Date
    // interprets this as local time, which matches what the user picked.
    onChange(new Date(raw));
  };

  const clear = () => onChange(null);

  return (
    <div className="sf-schedule-picker">
      <label className="sf-field-label" htmlFor="post-scheduled-for">
        Agendar para
      </label>
      <div className="sf-schedule-picker__row">
        <input
          id="post-scheduled-for"
          type="datetime-local"
          className="sf-input"
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            className="sf-button sf-button--secondary"
            onClick={clear}
            disabled={disabled}
          >
            Limpar
          </button>
        )}
      </div>
      <p className="sf-field-hint">
        Deixe em branco para salvar como rascunho. Datas devem estar pelo menos 1 minuto no futuro.
      </p>
    </div>
  );
}