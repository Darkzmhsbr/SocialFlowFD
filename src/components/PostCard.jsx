import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import { formatDateTime, formatRelative } from '../utils/formatDate.js';

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

export default function PostCard({ post, onArchive, onDelete }) {
  const [busy, setBusy] = useState(null); // 'archive' | 'delete' | null

  const firstMedia = post.medias?.[0];
  const canEdit = EDITABLE.has(post.status);
  const canDelete = !UNDELETABLE.has(post.status);
  const canArchive = post.status !== 'ARCHIVED' && post.status !== 'PUBLISHING';

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
    <article className="sf-post-card">
      <div className="sf-post-card__thumb">
        {firstMedia ? (
          firstMedia.type === 'IMAGE' ? (
            <img src={firstMedia.url} alt="" />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={firstMedia.url} muted playsInline preload="metadata" />
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
        </div>
      </div>

      <div className="sf-post-card__actions">
        {canEdit && (
          <Link className="sf-button sf-button--secondary" to={`/posts/${post.id}/edit`}>
            Editar
          </Link>
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
      </div>
    </article>
  );
}