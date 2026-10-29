import { POST_TYPE_LABELS } from '../utils/postConstants.js';

// Rodada 4: strip above the posts list with one chip per batch present in
// the current tab. Counts reflect only the loaded tab; the "Gerenciar"
// modal fetches the full batch from the backend.
export default function BatchStrip({ posts, onManage }) {
  const groups = new Map();
  for (const post of posts || []) {
    if (!post.batchId) continue;
    const group = groups.get(post.batchId) || { batchId: post.batchId, count: 0, accounts: new Set(), type: post.type };
    group.count += 1;
    if (post.instagramAccount?.id) group.accounts.add(post.instagramAccount.id);
    groups.set(post.batchId, group);
  }

  if (groups.size === 0) return null;

  return (
    <div className="sf-batch-strip">
      {[...groups.values()].map((group) => (
        <div key={group.batchId} className="sf-batch-strip__chip">
          <span className="sf-post-card__batch">Lote</span>
          <span className="sf-batch-strip__text">
            {POST_TYPE_LABELS[group.type] || group.type} · {group.count} post{group.count === 1 ? '' : 's'} nesta página
            · {group.accounts.size} perfi{group.accounts.size === 1 ? 'l' : 's'}
          </span>
          <button
            type="button"
            className="sf-button sf-button--secondary sf-button--small"
            onClick={() => onManage(group.batchId)}
          >
            Gerenciar lote
          </button>
        </div>
      ))}
    </div>
  );
}