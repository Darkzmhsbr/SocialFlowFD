import { NavLink } from 'react-router-dom';
import UserMenu from './UserMenu.jsx';
import '../styles/header.css';

// Nav lives in the header so every page picks up the same shell without
// duplicating the brand block. NavLink attaches an `active` class when the
// route matches; the CSS uses that to highlight the current section.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/posts', label: 'Posts' },
];

export default function Header() {
  return (
    <header className="sf-header">
      <div className="sf-header__inner">
        <div className="sf-header__brand">
          <span className="sf-header__logo">SF</span>
          <span className="sf-header__name">SocialFlow</span>
        </div>

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

        <UserMenu />
      </div>
    </header>
  );
}