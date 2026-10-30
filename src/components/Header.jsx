import { NavLink } from 'react-router-dom';
import UserMenu from './UserMenu.jsx';
import '../styles/header.css';
// Ajuste: links do menu só para usuário logado.
import { useLocation } from 'react-router-dom';
import { getToken } from '../services/api.js';
// Rodada 5: notifications bell (only for logged-in users).
import NotificationBell from './NotificationBell.jsx';
import '../styles/notifications.css';
// Rodada 6: side menu (replaces the top links for logged-in users).
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Icon from './Icon.jsx';
import '../styles/sidebar.css';

// Rodada 6: the top Dashboard/Posts links are replaced by the side menu.
// Set to false to bring the old top links back (rollback lever).
const SIDEBAR_ENABLED = true;
const COLLAPSED_STORAGE_KEY = 'sf_sidebar_collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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

  // Rodada 6: side menu state.
  const showSidebar = SIDEBAR_ENABLED && showNav;
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return next;
    });
  };

  // Body classes drive the layout shift (see sidebar.css).
  useEffect(() => {
    const body = document.body;
    body.classList.toggle('sf-has-sidebar', showSidebar);
    body.classList.toggle('sf-sidebar-collapsed', showSidebar && collapsed);
    body.classList.toggle('sf-sidebar-open', showSidebar && mobileOpen);
    return () => {
      body.classList.remove('sf-has-sidebar', 'sf-sidebar-collapsed', 'sf-sidebar-open');
    };
  }, [showSidebar, collapsed, mobileOpen]);

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <>
    <header className="sf-header">
      <div className="sf-header__inner">
        {/* Rodada 6: ☰ (mobile) + brand */}
        <div className="sf-header__left">
        {showSidebar && (
          <button
            type="button"
            className="sf-header__menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
          >
            <Icon name="menu" />
          </button>
        )}
        <div className="sf-header__brand">
          <span className="sf-header__logo">SF</span>
          <span className="sf-header__name">SocialFlow</span>
        </div>
        </div>

        {showNav && !showSidebar && ( /* Rodada 6: was {showNav && ( — links moved to the side menu */
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
    {/* Rodada 6 */}
    {showSidebar && (
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
    )}
    </>
  );
}