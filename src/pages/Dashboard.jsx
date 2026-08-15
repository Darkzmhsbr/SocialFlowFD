import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import ConnectInstagramButton from '../components/ConnectInstagramButton.jsx';
import InstagramAccountCard from '../components/InstagramAccountCard.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/states.jsx';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import { readAndClearParam } from '../utils/queryParams.js';
import '../styles/dashboard.css';

const CALLBACK_MESSAGES = {
  connected: { tone: 'success', message: '✓ Instagram conectado com sucesso.' },
  denied: { tone: 'error', message: 'A autorização foi cancelada. Nenhuma conta foi conectada.' },
  error: { tone: 'error', message: 'Não foi possível conectar a conta. Tente novamente.' },
};

export default function Dashboard() {
  const { status, accounts, error, reload, disconnect } = useInstagramAccounts();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const paramValue = readAndClearParam('instagram');
    const callbackInfo = CALLBACK_MESSAGES[paramValue];
    if (callbackInfo) {
      setToast(callbackInfo);
      reload();
    }
    // Only run once on mount - the param is stripped from the URL immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main">
        <DashboardCard
          title="Instagram"
          subtitle={
            status === 'success'
              ? `${accounts.length} conta${accounts.length === 1 ? '' : 's'} conectada${accounts.length === 1 ? '' : 's'}`
              : undefined
          }
          actions={<ConnectInstagramButton />}
        >
          {status === 'loading' && <LoadingState message="Carregando contas conectadas..." />}

          {status === 'error' && <ErrorState message={error} onRetry={reload} />}

          {status === 'success' && accounts.length === 0 && (
            <EmptyState message="Nenhuma conta conectada" />
          )}

          {status === 'success' && accounts.length > 0 && (
            <div className="sf-account-list">
              {accounts.map((account) => (
                <InstagramAccountCard key={account.id} account={account} onDisconnect={disconnect} />
              ))}
            </div>
          )}
        </DashboardCard>
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
