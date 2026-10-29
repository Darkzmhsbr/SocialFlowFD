import { STAGGER_WINDOW_OPTIONS, STAGGER_INTERVAL_OPTIONS } from '../utils/postConstants.js';
import { formatDateTime } from '../utils/formatDate.js';

// Rodada 4: staggering controls for the batch composer. The backend does
// the actual math (scheduledPostService.buildStaggerPlan); this component
// only collects the options and previews the resulting time span:
//   - media i starts at base + i * itemIntervalMinutes
//   - the profiles of each media are spread over windowMinutes, in random
//     order, with random jitter — no two profiles post at the same second
export default function BatchScheduleOptions({
  value,
  onChange,
  itemCount,
  accountCount,
  baseDate,
  disabled = false,
}) {
  const set = (patch) => onChange({ ...value, ...patch });

  let preview = null;
  if (baseDate && itemCount > 0 && accountCount > 0) {
    if (value.enabled) {
      const endMs =
        baseDate.getTime() +
        Math.max(0, itemCount - 1) * value.itemIntervalMinutes * 60 * 1000 +
        value.windowMinutes * 60 * 1000;
      preview = `Primeiro post às ${formatDateTime(baseDate)}. Último por volta de ${formatDateTime(new Date(endMs))}.`;
    } else {
      preview = `Todos os ${itemCount * accountCount} posts saem a partir de ${formatDateTime(baseDate)}.`;
    }
  }

  return (
    <div className="sf-stagger">
      <label className="sf-stagger__toggle">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          disabled={disabled}
        />
        <span>
          <strong>Escalonar as publicações (recomendado)</strong>
          <span className="sf-field-hint">
            Cada perfil publica em um horário diferente, em ordem aleatória. Evita que todas as contas postem o
            mesmo conteúdo no mesmo segundo.
          </span>
        </span>
      </label>

      {value.enabled && (
        <div className="sf-stagger__fields">
          <label className="sf-stagger__field">
            <span className="sf-field-label">Espalhar os perfis em</span>
            <select
              className="sf-select"
              value={value.windowMinutes}
              onChange={(e) => set({ windowMinutes: Number(e.target.value) })}
              disabled={disabled}
            >
              {STAGGER_WINDOW_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </select>
          </label>

          <label className="sf-stagger__field">
            <span className="sf-field-label">Intervalo entre mídias no mesmo perfil</span>
            <select
              className="sf-select"
              value={value.itemIntervalMinutes}
              onChange={(e) => set({ itemIntervalMinutes: Number(e.target.value) })}
              disabled={disabled}
            >
              {STAGGER_INTERVAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {value.enabled && value.itemIntervalMinutes === 0 && itemCount > 1 && (
        <p className="sf-field-hint sf-field-hint--warning">
          Com intervalo 0, todas as mídias saem quase juntas em cada perfil.
        </p>
      )}

      {preview ? (
        <p className="sf-stagger__preview">{preview}</p>
      ) : (
        <p className="sf-field-hint">Escolha a data, os perfis e as mídias para ver a previsão de horários.</p>
      )}
    </div>
  );
}

function formatMinutes(m) {
  if (m === 0) return 'Sem intervalo';
  if (m < 60) return `${m} minutos`;
  const h = m / 60;
  return `${h} hora${h === 1 ? '' : 's'}`;
}