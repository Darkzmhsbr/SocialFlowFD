import { Link } from 'react-router-dom';
import DashboardCard from './DashboardCard.jsx';
import ConnectInstagramButton from './ConnectInstagramButton.jsx';
import AccountHealthBanner from './AccountHealthBanner.jsx';
import { LoadingState, ErrorState } from './states.jsx';
import { classifyAccount } from '../pages/Accounts.jsx';
import '../styles/accounts.css';

// Rodada 6: compact accounts block for the Dashboard (the full list now
// lives in /accounts). Shows totals, problem/pause alerts and avatars.
const MAX_AVATARS = 12;

export default function AccountsSummaryCard({ status, accounts, error, onRetry }) {
  const counts = { active: 0, paused: 0, problem: 0 };
  for (const a of accounts || []) counts[classifyAccount(a)] += 1;
  const total = (accounts || []).length;

  return (
    <DashboardCard
      title="Instagram"
      subtitle={
        status === 'success'
          ? `${total} conta${total === 1 ? '' : 's'} conectada${total === 1 ? '' : 's'}`
          : undefined
      }
      actions={
        <div className="sf-accounts-summary__actions">
          <Link to="/accounts" className="sf-button sf-button--secondary">
            Ver contas
          </Link>
          <ConnectInstagramButton />
        </div>
      }
    >
      {status === 'loading' && <LoadingState message="Carregando contas conectadas..." />}
      {status === 'error' && <ErrorState message={error} onRetry={onRetry} />}

      {status === 'success' && total === 0 && (
        <p className="sf-field-hint">Nenhuma conta conectada. Use “+ Conectar Instagram” para começar.</p>
      )}

      {status === 'success' && total > 0 && (
        <>
          <div className="sf-accounts-summary__counts">
            <span className="sf-pill sf-pill--success">{counts.active} ativa{counts.active === 1 ? '' : 's'}</span>
            {counts.paused > 0 && <span className="sf-pill sf-pill--warning">{counts.paused} em pausa</span>}
            {counts.problem > 0 && (
              <span className="sf-pill sf-pill--error">{counts.problem} com problema</span>
            )}
          </div>

          <AccountHealthBanner accounts={accounts} />

          <Link to="/accounts" className="sf-accounts-summary__avatars" aria-label="Ver todas as contas">
            {accounts.slice(0, MAX_AVATARS).map((a) => (
              <span
                key={a.id}
                className={`sf-accounts-summary__avatar sf-accounts-summary__avatar--${classifyAccount(a)}`}
                title={`@${a.username}`}
              >
                {a.profilePictureUrl ? (
                  <img src={a.profilePictureUrl} alt="" />
                ) : (
                  (a.username || '?').charAt(0).toUpperCase()
                )}
              </span>
            ))}
            {total > MAX_AVATARS && <span className="sf-accounts-summary__more">+{total - MAX_AVATARS}</span>}
          </Link>
        </>
      )}
    </DashboardCard>
  );
}