import ConnectInstagramButton from './ConnectInstagramButton.jsx';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/notifications.css';

// Rodada 5: alert at the top of the accounts card for profiles that can't
// publish right now:
//   - down (status != ACTIVE): restricted/disabled/token invalid. Posts wait
//     in the queue until the user reconnects (connecting the same Instagram
//     again clears the problem).
//   - paused (publishPausedUntil in the future): Meta limit. Resumes alone.
export default function AccountHealthBanner({ accounts }) {
  const now = Date.now();
  const down = (accounts || []).filter((a) => a.status && a.status !== 'ACTIVE');
  const paused = (accounts || []).filter(
    (a) => a.status === 'ACTIVE' && a.publishPausedUntil && new Date(a.publishPausedUntil).getTime() > now
  );

  if (down.length === 0 && paused.length === 0) return null;

  return (
    <div className="sf-health">
      {down.map((a) => (
        <div key={a.id} className="sf-health__row sf-health__row--error">
          <div className="sf-health__text">
            <strong>@{a.username} com problema</strong>
            <span>
              {a.lastErrorMessage ||
                'O Instagram não está aceitando publicações deste perfil (restrito, desativado ou acesso removido).'}{' '}
              Os posts deste perfil estão pausados na fila. Verifique o perfil no Instagram e reconecte — logado nele
              neste navegador — que as publicações voltam sozinhas.
            </span>
          </div>
          <ConnectInstagramButton />
        </div>
      ))}

      {paused.map((a) => (
        <div key={a.id} className="sf-health__row sf-health__row--warning">
          <div className="sf-health__text">
            <strong>@{a.username} em pausa até {formatDateTime(a.publishPausedUntil)}</strong>
            <span>
              {a.pauseReason ? `Motivo: ${a.pauseReason}. ` : ''}
              As publicações deste perfil retomam automaticamente depois da pausa.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}