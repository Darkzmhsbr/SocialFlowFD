import { useCallback, useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { POST_STATUS_LABELS, POST_TYPE_LABELS } from '../utils/postConstants.js';
import { formatDateTime } from '../utils/formatDate.js';
import * as postsService from '../services/postsService.js';

// Rodada 4: full view of one batch (every profile, every post) with bulk
// actions. Data comes from GET /api/posts/batch/:batchId, so it is always
// complete, regardless of which tab of /posts is open.
//
// Bulk delete/archive skip posts the worker is touching (QUEUED /
// PUBLISHING) — the backend enforces it and reports how many were skipped.
export default function BatchActionsModal({ batchId, onClose, onChanged }) {
  const [state, setState] = useState({ status: 'loading', batch: null, posts: [], error: null });
  const [busy, setBusy] = useState(null); // 'archive' | 'delete' | null

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const { batch, posts } = await postsService.getPostBatch(batchId);
      setState({ status: 'success', batch, posts: posts || [], error: null });
    } catch (err) {
      setState({ status: 'error', batch: null, posts: [], error: err.message });
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const handleArchive = async () => {
    if (!window.confirm('Arquivar todos os posts deste lote que ainda não estão em publicação?')) return;
    setBusy('archive');
    try {
      const { archived } = await postsService.archivePostBatch(batchId);
      onChanged(
        `✓ ${archived.archived} post(s) arquivado(s)${archived.skipped ? ` · ${archived.skipped} ignorado(s)` : ''}.`
      );
      onClose();
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    const published = state.batch?.byStatus?.PUBLISHED || 0;
    const message =
      'Excluir todos os posts deste lote?\n\n' +
      'Posts na fila ou em publicação não serão excluídos.' +
      (published > 0
        ? `\n\n${published} post(s) já publicado(s) continuarão visíveis no Instagram — o SocialFlow só remove o registro daqui.`
        : '') +
      '\n\nEssa ação não pode ser desfeita.';
    if (!window.confirm(message)) return;

    setBusy('delete');
    try {
      const { deleted } = await postsService.deletePostBatch(batchId);
      onChanged(
        `✓ ${deleted.deleted} post(s) excluído(s)${deleted.skipped ? ` · ${deleted.skipped} em publicação mantido(s)` : ''}.`
      );
      onClose();
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setBusy(null);
    }
  };

  const { status, batch, posts, error } = state;

  return (
    <div
      className="sf-batch-modal__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="sf-batch-modal" role="dialog" aria-modal="true" aria-label="Gerenciar lote">
        <div className="sf-batch-modal__header">
          <div>
            <h3 className="sf-batch-modal__title">Lote de publicações</h3>
            {batch && (
              <p className="sf-field-hint">
                {POST_TYPE_LABELS[posts[0]?.type] || ''} · {batch.total} posts em {batch.accounts} perfi
                {batch.accounts === 1 ? 'l' : 's'}
                {batch.firstScheduledFor &&
                  ` · ${formatDateTime(batch.firstScheduledFor)} → ${formatDateTime(batch.lastScheduledFor)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            className="sf-button sf-button--secondary sf-button--small"
            onClick={onClose}
            disabled={busy !== null}
          >
            Fechar
          </button>
        </div>

        {status === 'loading' && <p className="sf-field-hint">Carregando lote...</p>}

        {error && <p className="sf-field-hint sf-field-hint--error">{error}</p>}

        {status === 'success' && batch && (
          <>
            <div className="sf-batch-modal__counts">
              {Object.entries(batch.byStatus).map(([key, count]) => (
                <span key={key} className="sf-batch-modal__count">
                  {POST_STATUS_LABELS[key] || key}: <strong>{count}</strong>
                </span>
              ))}
            </div>

            <ul className="sf-batch-modal__list">
              {posts.map((post) => (
                <li key={post.id} className="sf-batch-modal__row">
                  <span className="sf-batch-modal__account">@{post.instagramAccount?.username}</span>
                  <span className="sf-batch-modal__date">
                    {post.publishedAt
                      ? `Publicado ${formatDateTime(post.publishedAt)}`
                      : post.scheduledFor
                      ? formatDateTime(post.scheduledFor)
                      : 'Sem data'}
                  </span>
                  <StatusBadge status={post.status} />
                  {post.failureReason && (
                    <span className="sf-batch-modal__failure">{post.failureReason}</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="sf-batch-modal__actions">
              <button
                type="button"
                className="sf-button sf-button--secondary"
                onClick={handleArchive}
                disabled={busy !== null}
              >
                {busy === 'archive' ? 'Arquivando...' : 'Arquivar lote'}
              </button>
              <button
                type="button"
                className="sf-button sf-button--danger"
                onClick={handleDelete}
                disabled={busy !== null}
              >
                {busy === 'delete' ? 'Excluindo...' : 'Excluir lote'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}