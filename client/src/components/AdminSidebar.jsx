import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin',              label: 'DASHBOARD',    icon: '◈' },
  { to: '/admin/submissions',  label: 'SUBMISSIONS',  icon: '◎' },
  { to: '/admin/teams',        label: 'TEAMS',        icon: '◉' },
  { to: '/admin/participants', label: 'PARTICIPANTS', icon: '⊕' },
  { to: '/admin/leaderboard',  label: 'LEADERBOARD',  icon: '★' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('tos_admin_token');
    navigate('/admin/login', { replace: true });
  };
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="label-coord">COMMAND TERMINAL</span>
        <span className="sidebar-version label-coord" style={{ color: 'var(--outline-variant)' }}>
          v1.0.0
        </span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="label-coord" style={{ color: 'var(--outline-variant)' }}>
          SYS::ADMIN MODE
        </span>
        <button
          className="sidebar-logout"
          onClick={handleLogout}
          title="End admin session and return to the login page"
        >
          ⏻ LOGOUT
        </button>
      </div>

      <style>{`
        .admin-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--surface-low);
          border-right: 1px solid var(--outline-variant);
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 56px);
          position: sticky;
          top: 56px;
        }
        .sidebar-brand {
          padding: var(--space-lg) var(--space-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--outline-variant);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: var(--space-md) 0;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 0.625rem var(--space-md);
          font-family: var(--font-mono);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--outline);
          text-decoration: none;
          border-left: 2px solid transparent;
          transition: all var(--transition);
        }
        .sidebar-link:hover {
          color: var(--on-surface);
          background: rgba(245,197,24,0.04);
        }
        .sidebar-link--active {
          color: var(--primary-bright);
          border-left-color: var(--primary-bright);
          background: rgba(245,197,24,0.06);
        }
        .sidebar-icon { font-size: 0.75rem; }
        .sidebar-footer {
          padding: var(--space-md);
          border-top: 1px solid var(--outline-variant);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .sidebar-logout {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.06);
          border: 1px solid rgba(255, 107, 107, 0.25);
          border-radius: 4px;
          cursor: pointer;
          transition: all var(--transition);
        }
        .sidebar-logout:hover {
          background: rgba(255, 107, 107, 0.14);
          border-color: rgba(255, 107, 107, 0.5);
        }
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100%;
            min-height: auto;
            flex-direction: row;
            border-right: none;
            border-bottom: 1px solid var(--outline-variant);
            position: sticky;
            top: 56px;
            z-index: 50;
          }
          .sidebar-brand, .sidebar-footer { display: none; }
          .sidebar-nav { flex-direction: row; padding: 0; overflow-x: auto; }
          .sidebar-link { padding: var(--space-md); white-space: nowrap; border-left: none; border-bottom: 2px solid transparent; }
          .sidebar-link--active { border-left: none; border-bottom-color: var(--primary-bright); }
        }
      `}</style>
    </aside>
  );
}
