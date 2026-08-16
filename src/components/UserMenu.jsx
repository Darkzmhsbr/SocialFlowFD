import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Slot on the right side of the header. Renders the current auth state
// as either "Entrar / Criar conta" links (unauthenticated) or a small
// "Olá, Nome | Sair" pair (authenticated). Kept intentionally simple -
// a full dropdown menu comes later if we need more account actions.
export default function UserMenu() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') {
    return <div className="sf-user-menu__loading">…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="sf-user-menu">
        <Link to="/login" className="sf-user-menu__link">
          Entrar
        </Link>
        <Link to="/register" className="sf-user-menu__link sf-user-menu__link--primary">
          Criar conta
        </Link>
      </div>
    );
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'você';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="sf-user-menu">
      <span className="sf-user-menu__greeting">Olá, {displayName}</span>
      <button type="button" className="sf-user-menu__logout" onClick={handleLogout}>
        Sair
      </button>
    </div>
  );
}