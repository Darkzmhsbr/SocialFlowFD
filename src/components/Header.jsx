import { NavLink } from 'react-router-dom';
import UserMenu from './UserMenu.jsx';
import '../styles/header.css';
// Ajuste: links do menu só para usuário logado.
import { useLocation } from 'react-router-dom';
import { getToken } from '../services/api.js';
// Rodada 5: notifications bell (only for logged-in users).
import NotificationBell from './NotificationBell.jsx';
import '../styles/notifications.css';

// Public pages where the Dashboard/Posts links must NOT appear (the user
// isn't logged in there, and clicking them would just bounce to /login).
const PUBLIC_PATHS = ['/login', '/register'];

// Nav lives in the header so every page picks up the same shell without
// duplicating the brand block. NavLink attaches an `active` class when the
// route matches; the CSS uses that to highlight the current section.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/posts', label: 'Posts' },
];

export default function Header() {
  // Each page renders its own <Header />, so after login/logout the next
  // page mounts a fresh header and re-reads the stored token.
  const { pathname } = useLocation();
  const showNav = !PUBLIC_PATHS.includes(pathname) && Boolean(getToken());

  return (
    <header className="sf-header">
      <div className="sf-header__inner">
        <div className="sf-header__brand">
          <span className="sf-header__logo">SF</span>
          <span className="sf-header__name">SocialFlow</span>
        </div>

        {showNav && (
        <nav className="sf-header__nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sf-header__nav-link${isActive ? ' sf-header__nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        )}

        {/* Rodada 5: bell + user menu grouped on the right */}
        <div className="sf-header__actions">
        {showNav && <NotificationBell />}
        <UserMenu />
        </div>
      </div>
    </header>
  );
}