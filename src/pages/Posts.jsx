import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import StatusTabs from '../components/StatusTabs.jsx';
import PostCard from '../components/PostCard.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/states.jsx';
import { usePosts } from '../hooks/usePosts.js';
import { STATUS_TABS } from '../utils/postConstants.js';
import '../styles/posts.css';

export default function Posts() {
  const [activeTab, setActiveTab] = useState(STATUS_TABS[0]);
  const { status, posts, error, reload, archive, remove } = usePosts(activeTab.filter);
  const [toast, setToast] = useState(null);

  const handleArchive = async (id) => {
    try {
      await archive(id);
      setToast({ tone: 'success', message: '✓ Post arquivado.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(id);
      setToast({ tone: 'success', message: '✓ Rascunho excluído.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main">
        <DashboardCard
          title="Posts"
          subtitle={
            status === 'success'
              ? `${posts.length} post${posts.length === 1 ? '' : 's'} nesta aba`
              : undefined
          }
          actions={
            <Link className="sf-button sf-button--primary" to="/posts/new">
              + Novo post
            </Link>
          }
        >
          <StatusTabs activeKey={activeTab.key} onChange={setActiveTab} />

          {status === 'loading' && <LoadingState message="Carregando posts..." />}
          {status === 'error' && <ErrorState message={error} onRetry={reload} />}
          {status === 'success' && posts.length === 0 && (
            <EmptyState message="Nenhum post nesta aba ainda." />
          )}
          {status === 'success' && posts.length > 0 && (
            <div className="sf-post-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
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