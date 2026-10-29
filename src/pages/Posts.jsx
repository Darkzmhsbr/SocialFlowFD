import { useEffect, useState } from 'react';
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
// Rodada 4: batch strip + batch management modal.
import BatchStrip from '../components/BatchStrip.jsx';
import BatchActionsModal from '../components/BatchActionsModal.jsx';
import '../styles/batch.css';
// Rodada 4.1: pagination + filter by profile.
import { usePostsPage } from '../hooks/usePostsPage.js';
import AccountFilterSelect from '../components/AccountFilterSelect.jsx';
import Pagination from '../components/Pagination.jsx';
import { POSTS_PAGE_SIZE } from '../utils/postConstants.js';

export default function Posts() {
  const [activeTab, setActiveTab] = useState(STATUS_TABS[0]);
  // Rodada 4.1: profile filter + current page (0-based).
  const [accountFilter, setAccountFilter] = useState(null);
  const [page, setPage] = useState(0);
  // Rodada 4.1: was usePosts(activeTab.filter) — first 50 posts only.
  const { status, posts, total, error, reload, archive, remove, publishNow } = usePostsPage(activeTab.filter, {
    accountId: accountFilter,
    page,
    pageSize: POSTS_PAGE_SIZE,
  });

  // Rodada 4.1: changing tab or profile goes back to the first page.
  useEffect(() => {
    setPage(0);
  }, [activeTab.key, accountFilter]);

  // Rodada 4.1: deleting/archiving the last posts of the last page leaves
  // it empty — step back one page instead of showing "nenhum post".
  useEffect(() => {
    if (status === 'success' && posts.length === 0 && page > 0) {
      setPage((p) => Math.max(0, p - 1));
    }
  }, [status, posts.length, page]);
  const [toast, setToast] = useState(null);
  // Rodada 4: batch currently open in the management modal (null = closed).
  const [openBatchId, setOpenBatchId] = useState(null);

  const handleBatchChanged = (message) => {
    setToast({ tone: 'success', message });
    reload();
  };

  const handleArchive = async (id) => {
    try {
      await archive(id);
      setToast({ tone: 'success', message: '✓ Post arquivado.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  // Rodada 5: "Publicar agora"
  const handlePublishNow = async (id) => {
    try {
      const notice = await publishNow(id);
      setToast({ tone: 'success', message: `✓ ${notice || 'Post na fila de publicação.'}` });
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
              ? `${total} post${total === 1 ? '' : 's'} nesta aba` // Rodada 4.1: was posts.length (page only)
              : undefined
          }
          actions={
            <Link className="sf-button sf-button--primary" to="/posts/new">
              + Novo post
            </Link>
          }
        >
          <StatusTabs activeKey={activeTab.key} onChange={setActiveTab} />

          {/* Rodada 4.1: filter by profile */}
          <div className="sf-posts-toolbar">
            <AccountFilterSelect value={accountFilter} onChange={setAccountFilter} />
          </div>

          {/* Rodada 4: one chip per batch in this tab, with "Gerenciar lote" */}
          {status === 'success' && posts.length > 0 && (
            <BatchStrip posts={posts} onManage={setOpenBatchId} />
          )}

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
                  onPublishNow={handlePublishNow}
                />
              ))}
            </div>
          )}

          {/* Rodada 4.1: pagination */}
          {status === 'success' && (
            <Pagination
              page={page}
              pageSize={POSTS_PAGE_SIZE}
              total={total}
              onChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </DashboardCard>
      </main>

      {/* Rodada 4: batch management modal */}
      {openBatchId && (
        <BatchActionsModal
          batchId={openBatchId}
          onClose={() => setOpenBatchId(null)}
          onChanged={handleBatchChanged}
        />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}