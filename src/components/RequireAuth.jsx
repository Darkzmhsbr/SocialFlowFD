import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './states.jsx';

// Wraps every route the app requires an authenticated user for. Renders a
// small loading state while /me is being checked (so we don't flicker to
// /login for a valid stored token), then either the children or a redirect.
//
// The `state.from` handoff lets the Login page bounce the user back to
// where they wanted to go after a successful login.
export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="sf-page">
        <main className="sf-main">
          <LoadingState message="Carregando..." />
        </main>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}