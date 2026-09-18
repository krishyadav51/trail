import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTeamCode } from '../hooks/useTeamCode';

export default function Navbar() {
  const { teamCode, clearTeamCode } = useTeamCode();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    clearTeamCode();
    navigate('/team?loggedOut=1');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner page-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">◈</span>
          <span className="navbar-logo-text">
            TRAIL<span className="text-gold">.</span>OF<span className="text-gold">.</span>SECRET
          </span>
        </Link>

        {/* Coordinate decoration */}
        <div className="navbar-coord label-coord" aria-hidden="true">
          SYS::OPERATIVE
        </div>

        {/* Nav links */}
        <div className="navbar-links">
          <Link
            to="/leaderboard"
            className={`navbar-link ${isActive('/leaderboard') ? 'active' : ''}`}
          >
            [ STANDINGS ]
          </Link>
          <Link
            to="/admin"
            className={`navbar-link ${isActive('/admin') ? 'active' : ''}`}
          >
            [ COMMAND ]
          </Link>

          {teamCode ? (
            <div className="navbar-team-badge">
              <Link to="/game" className="team-code-badge">
                <span className="chip chip-unlocked">
                  <span className="chip-dot" />
                  {teamCode}
                </span>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                EXIT
              </button>
            </div>
          ) : (
            <Link to="/team" className="btn btn-recon btn-sm">
              ACCESS
            </Link>
          )}
        </div>
      </div>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(13,13,13,0.92);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--outline-variant);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          height: 56px;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          text-decoration: none;
          flex-shrink: 0;
        }
        .navbar-logo-icon {
          color: var(--primary-bright);
          font-size: 1.25rem;
          line-height: 1;
        }
        .navbar-logo-text {
          font-family: var(--font-headline);
          font-size: 0.9375rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--on-surface);
        }
        .navbar-coord {
          display: none;
          flex: 1;
          text-align: center;
        }
        @media (min-width: 768px) { .navbar-coord { display: block; } }
        .navbar-links {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-left: auto;
        }
        .navbar-link {
          font-family: var(--font-mono);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--outline);
          text-decoration: none;
          padding: 0.25rem 0;
          border-bottom: 1px solid transparent;
          transition: color var(--transition), border-color var(--transition);
        }
        .navbar-link:hover,
        .navbar-link.active {
          color: var(--primary-bright);
          border-bottom-color: var(--primary-bright);
        }
        .navbar-team-badge {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .team-code-badge { text-decoration: none; }
      `}</style>
    </nav>
  );
}
