import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import '../styles/sidebar.css';

// Rodada 6: side menu.
//   Desktop (> 900px): fixed on the left; "recolher" shrinks it to icons only
//   (choice remembered in the browser).
//   Mobile (<= 900px): hidden drawer opened by the ☰ button in the top bar;
//   closes on overlay tap, Escape or navigation.
// New sections (Pastas, Biblioteca, ...) are added to SECTIONS.
const SECTIONS = [
  {
    label: 'Visão geral',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'Contas',
    items: [{ to: '/accounts', label: 'Contas', icon: 'users' }],
  },
  {
    label: 'Publicação',
    items: [
      { to: '/posts/new', label: 'Novo post', icon: 'plus', end: true },
      { to: '/posts', label: 'Agendamentos', icon: 'calendar', end: true },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }) {
  return (
    <>
      <div
        className={`sf-sidebar__overlay${mobileOpen ? ' is-open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`sf-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
        aria-label="Menu principal"
      >
        <div className="sf-sidebar__top">
          <div className="sf-sidebar__brand">
            <span className="sf-header__logo">SF</span>
            <span className="sf-sidebar__brand-name">SocialFlow</span>
          </div>
          <button
            type="button"
            className="sf-sidebar__close"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="sf-sidebar__nav">
          {SECTIONS.map((section) => (
            <div key={section.label} className="sf-sidebar__section">
              <p className="sf-sidebar__section-label">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `sf-sidebar__link${isActive ? ' is-active' : ''}`}
                >
                  <Icon name={item.icon} />
                  <span className="sf-sidebar__link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="sf-sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
          <span className="sf-sidebar__link-label">Recolher menu</span>
        </button>
      </aside>
    </>
  );
}