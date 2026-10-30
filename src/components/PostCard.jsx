import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import PostInsightsModal from './PostInsightsModal.jsx';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import { formatDateTime, formatRelative } from '../utils/formatDate.js';
// Rodada 4: styles for the "Lote" badge.
import '../styles/batch.css';
// Rodada 5: "Publicar agora" + pause/problem hints.
import '../styles/notifications.css';
// Rodada 12: "Arquivo liberado" placeholder.
import '../styles/cleanup.css';
// Rodada 16: "Duplicar" (copy as a new draft, then open it in the editor).
import { useNavigate } from 'react-router-dom';
import * as postsService from '../services/postsService.js';

// Rodada 5: statuses the backend accepts for "Publicar agora".
const PUBLISH_NOW = new Set(['DRAFT', 'SCHEDULED', 'FAILED']);

// Editable states can be opened in the composer. Everything else is view-only
// for now (a "view" screen is Phase 2.4 material).
const EDITABLE = new Set(['DRAFT', 'SCHEDULED', 'FAILED']);

// The worker owns these — deleting mid-flight would duplicate posts or
// leave orphan PostMedia rows. Must match UNDELETABLE_STATUSES on the
// backend (scheduledPostService.js).
const UNDELETABLE = new Set(['QUEUED', 'PUBLISHING']);

// Confirm copy tuned per status. PUBLISHED gets the extra-loud warning
// because "delete" here is a SocialFlow-only remove — the Instagram post
// itself stays live and Meta's API doesn't give us a reliable way to
// take it down.
function buildDeleteConfirmMessage(status) {
  if (status === 'PUBLISHED') {
    return (
      'Este post já foi publicado no Instagram.\n\n' +
      'Excluí-lo aqui apenas remove o registro do SocialFlow. ' +
      'A publicação continuará visível no seu perfil do Instagram — ' +
      'o SocialFlow não consegue apagá-la por lá.\n\n' +
      'Deseja continuar?'
    );
  }
  if (status === 'ARCHIVED') {
    return 'Excluir este post arquivado permanentemente? Essa ação não pode ser desfeita.';
  }
  if (status === 'FAILED') {
    return 'Excluir este post que falhou? Você pode arquivar em vez disso, se quiser manter o histórico.';
  }
  if (status === 'SCHEDULED') {
    return 'Excluir este agendamento? Ele não será publicado. Essa ação não pode ser desfeita.';
  }
  // DRAFT and anything else falls through to the original message.
  return 'Excluir este rascunho? Essa ação não pode ser desfeita.';
}

export default function PostCard({ post, onArchive, onDelete, onPublishNow }) {
  const [busy, setBusy] = useState(null); // 'archive' | 'delete' | 'publish' | null
  const [showInsights, setShowInsights] = useState(false);

  // Rodada 2b: when a custom cover was picked (only possible for FEED_VIDEO
  // and REEL), show it as the card thumb — that's the image users saw and
  // approved as "the face of this post", and it's what Instagram itself is
  // showing on the feed grid. Fall back to the first media asset for
  // everything else (images, carousels, stories, and videos without a
  // custom cover).
  const displayMedia = post.cover || post.medias?.[0];

  const canEdit = EDITABLE.has(post.status);
  const canDelete = !UNDELETABLE.has(post.status);
  const canArchive = post.status !== 'ARCHIVED' && post.status !== 'PUBLISHING';
  // Rodada 3: insights are only meaningful for published posts with an
  // instagramMediaId (the id Meta returns after /media_publish — needed
  // to call /{media-id}/insights).
  const canShowInsights = post.status === 'PUBLISHED' && Boolean(post.instagramMediaId);

  // Rodada 5: account state shown on the card + "Publicar agora".
  const account = post.instagramAccount;
  const accountDown = Boolean(account?.status && account.status !== 'ACTIVE');
  const accountPausedUntil =
    account?.publishPausedUntil && new Date(account.publishPausedUntil).getTime() > Date.now()
      ? account.publishPausedUntil
      : null;
  const canPublishNow = Boolean(onPublishNow) && PUBLISH_NOW.has(post.status) && !accountDown;

  // Rodada 16
  const navigate = useNavigate();
  const [duplicateError, setDuplicateError] = useState(null);
  const hasPurgedMedia = Boolean(post.cover?.purged || post.medias?.some((m) => m.purged));
  const handleDuplicate = async () => {
    setBusy('duplicate');
    setDuplicateError(null);
    try {
      const { post: copy } = await postsService.duplicatePost(post.id);
      navigate(`/posts/${copy.id}/edit`);
    } catch (err) {
      setDuplicateError(err.message);
      setBusy(null);
    }
  };

  const handlePublishNow = async () => {
    const msg =
      post.status === 'FAILED'
        ? 'Tentar publicar este post agora?'
        : 'Publicar este post agora, sem esperar o horário agendado?';
    if (!window.confirm(msg)) return;
    setBusy('publish');
    try {
      await onPublishNow(post.id);
    } finally {
      setBusy(null);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Arquivar este post?')) return;
    setBusy('archive');
    try {
      await onArchive(post.id);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(buildDeleteConfirmMessage(post.status))) return;
    setBusy('delete');
    try {
      await onDelete(post.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <article className="sf-post-card">
        <div className="sf-post-card__thumb">
          {/* Rodada 12: file freed by a cleanup (published post) */}
          {displayMedia?.purged ? (
            <div className="sf-post-card__purged">Arquivo liberado</div>
          ) : displayMedia ? (
            displayMedia.type === 'IMAGE' ? (
              <img src={displayMedia.url} alt="" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={displayMedia.url} muted playsInline preload="metadata" />
            )
          ) : (
            <div className="sf-post-card__thumb-placeholder">Sem mídia</div>
          )}
          {post.medias?.length > 1 && (
            <span className="sf-post-card__count">+{post.medias.length - 1}</span>
          )}
        </div>

        <div className="sf-post-card__body">
          <div className="sf-post-card__meta">
            <span className="sf-post-card__type">{POST_TYPE_LABELS[post.type]}</span>
            <StatusBadge status={post.status} />
            {/* Rodada 4: post created by the multi-profile batch composer */}
            {post.batchId && (
              <span className="sf-post-card__batch" title="Criado em lote para vários perfis">
                Lote
              </span>
            )}
          </div>

          {post.caption && (
            <p className="sf-post-card__caption">
              {post.caption.length > 140 ? `${post.caption.slice(0, 140)}...` : post.caption}
            </p>
          )}

          <div className="sf-post-card__footer">
            {post.instagramAccount && (
              <span className="sf-post-card__account">@{post.instagramAccount.username}</span>
            )}
            {post.scheduledFor && (
              <span className="sf-post-card__date">
                Agendado: {formatDateTime(post.scheduledFor)} ({formatRelative(post.scheduledFor)})
              </span>
            )}
            {post.publishedAt && (
              <span className="sf-post-card__date">
                Publicado: {formatDateTime(post.publishedAt)}
              </span>
            )}
            {post.failureReason && (
              <span className="sf-post-card__failure">Motivo da falha: {post.failureReason}</span>
            )}
            {/* Rodada 5: why a pending post is waiting */}
            {accountDown && PUBLISH_NOW.has(post.status) && (
              <span className="sf-post-card__hint sf-post-card__hint--error">
                ⚠ Perfil com problema — post aguardando reconexão no Dashboard.
              </span>
            )}
            {!accountDown && accountPausedUntil && post.status === 'SCHEDULED' && (
              <span className="sf-post-card__hint">
                ⏸ Perfil em pausa até {formatDateTime(accountPausedUntil)}
                {account.pauseReason ? ` (${account.pauseReason})` : ''}.
              </span>
            )}
          </div>
        </div>

        <div className="sf-post-card__actions">
          {/* Rodada 5 */}
          {canPublishNow && (
            <button
              type="button"
              className="sf-button sf-button--primary"
              onClick={handlePublishNow}
              disabled={busy !== null}
            >
              {busy === 'publish' ? 'Enviando...' : post.status === 'FAILED' ? 'Tentar agora' : 'Publicar agora'}
            </button>
          )}
          {canShowInsights && (
            <button
              type="button"
              className="sf-button sf-button--primary"
              onClick={() => setShowInsights(true)}
            >
              Métricas
            </button>
          )}
          {canEdit && (
            <Link className="sf-button sf-button--secondary" to={`/posts/${post.id}/edit`}>
              Editar
            </Link>
          )}
          {/* Rodada 16 */}
          {!hasPurgedMedia && (
            <button
              type="button"
              className="sf-button sf-button--secondary"
              onClick={handleDuplicate}
              disabled={busy !== null}
              title="Cria uma cópia como rascunho"
            >
              {busy === 'duplicate' ? 'Duplicando...' : 'Duplicar'}
            </button>
          )}
          {canArchive && (
            <button
              type="button"
              className="sf-button sf-button--secondary"
              onClick={handleArchive}
              disabled={busy !== null}
            >
              {busy === 'archive' ? 'Arquivando...' : 'Arquivar'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="sf-button sf-button--danger"
              onClick={handleDelete}
              disabled={busy !== null}
            >
              {busy === 'delete' ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
          {/* Rodada 16 */}
          {duplicateError && <span className="sf-field-hint sf-field-hint--error">{duplicateError}</span>}
        </div>
      </article>

      {showInsights && (
        <PostInsightsModal
          postId={post.id}
          accountId={post.instagramAccount?.id}
          onClose={() => setShowInsights(false)}
        />
      )}
    </>
  );
}