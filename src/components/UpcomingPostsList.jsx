import { Link } from 'react-router-dom';
import { POST_TYPE_LABELS } from '../utils/postConstants.js';
import { formatDateTime, formatRelative } from '../utils/formatDate.js';

// Compact list of the next scheduled posts. Each row links to the editor
// for that post so the user can adjust before publish time. Falls back to
// an empty state that nudges toward creating a post.
export default function UpcomingPostsList({ posts }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="sf-upcoming__empty">
        <p>Nenhum post agendado.</p>
        <Link to="/posts/new" className="sf-button sf-button--secondary">
          Agendar um post
        </Link>
      </div>
    );
  }

  return (
    <ul className="sf-upcoming">
      {posts.map((post) => (
        <li key={post.id} className="sf-upcoming__item">
          <div className="sf-upcoming__thumb">
            {post.thumbnail ? (
              post.thumbnail.type === 'IMAGE' ? (
                <img src={post.thumbnail.url} alt="" />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={post.thumbnail.url} muted playsInline preload="metadata" />
              )
            ) : (
              <div className="sf-upcoming__thumb-placeholder">—</div>
            )}
          </div>

          <div className="sf-upcoming__body">
            <div className="sf-upcoming__meta">
              <span className="sf-upcoming__type">{POST_TYPE_LABELS[post.type]}</span>
              {post.instagramAccount && (
                <span className="sf-upcoming__account">@{post.instagramAccount.username}</span>
              )}
            </div>
            {post.caption && (
              <p className="sf-upcoming__caption">
                {post.caption.length > 60 ? `${post.caption.slice(0, 60)}...` : post.caption}
              </p>
            )}
            <p className="sf-upcoming__date">
              {formatDateTime(post.scheduledFor)}{' '}
              <span className="sf-upcoming__relative">({formatRelative(post.scheduledFor)})</span>
            </p>
          </div>

          <Link
            to={`/posts/${post.id}/edit`}
            className="sf-button sf-button--secondary sf-upcoming__action"
          >
            Editar
          </Link>
        </li>
      ))}
    </ul>
  );
}