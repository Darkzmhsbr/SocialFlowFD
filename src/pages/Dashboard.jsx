import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import ConnectInstagramButton from '../components/ConnectInstagramButton.jsx';
import InstagramAccountCard from '../components/InstagramAccountCard.jsx';
import KpiCard from '../components/KpiCard.jsx';
import ActivityChart from '../components/ActivityChart.jsx';
import UpcomingPostsList from '../components/UpcomingPostsList.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/states.jsx';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import { useDashboardStats } from '../hooks/useDashboardStats.js';
import { readAndClearParam } from '../utils/queryParams.js';
import '../styles/dashboard.css';

const CALLBACK_MESSAGES = {
  connected: { tone: 'success', message: '✓ Instagram conectado com sucesso.' },
  denied: { tone: 'error', message: 'A autorização foi cancelada. Nenhuma conta foi conectada.' },
  error: { tone: 'error', message: 'Não foi possível conectar a conta. Tente novamente.' },
};

export default function Dashboard() {
  const {
    status: accountsStatus,
    accounts,
    error: accountsError,
    reload: reloadAccounts,
    disconnect,
  } = useInstagramAccounts();

  const {
    status: statsStatus,
    stats,
    error: statsError,
    reload: reloadStats,
  } = useDashboardStats();

  const [toast, setToast] = useState(null);

  useEffect(() => {
    const paramValue = readAndClearParam('instagram');
    const callbackInfo = CALLBACK_MESSAGES[paramValue];
    if (callbackInfo) {
      setToast(callbackInfo);
      reloadAccounts();
      reloadStats();
    }
    // Only run once on mount - the param is stripped from the URL immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main">
        {/* Greeting + primary CTA */}
        <div className="sf-hero">
          <div>
            <h1 className="sf-hero__title">Bem-vindo ao SocialFlow</h1>
            <p className="sf-hero__subtitle">Aqui está um resumo do teu SocialFlow.</p>
          </div>
          <Link to="/posts/new" className="sf-button sf-button--primary">
            + Novo post
          </Link>
        </div>

        {/* KPIs */}
        {statsStatus === 'loading' && (
          <div className="sf-kpi-grid sf-kpi-grid--loading">
            <LoadingState message="Carregando métricas..." />
          </div>
        )}

        {statsStatus === 'error' && (
          <ErrorState message={statsError} onRetry={reloadStats} />
        )}

        {statsStatus === 'success' && stats && (
          <>
            <div className="sf-kpi-grid">
              <KpiCard
                label="Contas conectadas"
                value={stats.counts.connectedAccounts}
                hint="Instagram"
                tone="accent"
              />
              <KpiCard
                label="Agendados"
                value={stats.counts.scheduledPosts}
                hint="pra publicar"
                tone="warning"
              />
              <KpiCard
                label="Publicados"
                value={stats.counts.publishedThisMonth}
                hint="este mês"
                tone="success"
              />
              <KpiCard
                label="Rascunhos"
                value={stats.counts.drafts}
                hint="salvos"
                tone="neutral"
              />
            </div>

            {/* Chart + Upcoming side by side (stack on mobile) */}
            <div className="sf-dashboard-row">
              <DashboardCard title="Atividade" subtitle="Posts criados nos últimos 14 dias">
                <ActivityChart data={stats.activity} />
              </DashboardCard>

              <DashboardCard
                title="Próximos posts"
                subtitle={
                  stats.upcomingPosts.length > 0
                    ? `${stats.upcomingPosts.length} agendado${stats.upcomingPosts.length === 1 ? '' : 's'}`
                    : undefined
                }
              >
                <UpcomingPostsList posts={stats.upcomingPosts} />
              </DashboardCard>
            </div>
          </>
        )}

        {/* Instagram accounts (existing card) */}
        <DashboardCard
          title="Instagram"
          subtitle={
            accountsStatus === 'success'
              ? `${accounts.length} conta${accounts.length === 1 ? '' : 's'} conectada${accounts.length === 1 ? '' : 's'}`
              : undefined
          }
          actions={<ConnectInstagramButton />}
        >
          {accountsStatus === 'loading' && (
            <LoadingState message="Carregando contas conectadas..." />
          )}

          {accountsStatus === 'error' && (
            <ErrorState message={accountsError} onRetry={reloadAccounts} />
          )}

          {accountsStatus === 'success' && accounts.length === 0 && (
            <EmptyState message="Nenhuma conta conectada" />
          )}

          {accountsStatus === 'success' && accounts.length > 0 && (
            <div className="sf-account-list">
              {accounts.map((account) => (
                <InstagramAccountCard
                  key={account.id}
                  account={account}
                  onDisconnect={async (id) => {
                    await disconnect(id);
                    reloadStats();
                  }}
                />
              ))}
            </div>
          )}
        </DashboardCard>
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}