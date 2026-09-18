import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useTeamCode } from '../hooks/useTeamCode';

export default function HomePage() {
  const { teamCode } = useTeamCode();

  return (
    <MainLayout>
      <div className="home-page page-container">
        {/* Hero */}
        <section className="hero-section animate-fade-in">
          <div className="hero-coord-row" aria-hidden="true">
            <span className="coord-label">LAT: 12.9716° N</span>
            <span className="reticle-line" />
            <span className="coord-label">LNG: 79.1587° E</span>
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="chip chip-approved">
                <span className="chip-dot" />
                CLASSIFIED MISSION
              </span>
            </div>
            <h1 className="display-lg hero-title">
              TRAIL<br />
              <span className="text-gold">OF</span><br />
              SECRET
            </h1>
            <p className="hero-subtitle body-lg text-muted">
              An elite cipher-based treasure hunt. Each clue unlocks the next coordinate.
              Decrypt. Navigate. Discover.
            </p>
            <div className="hero-cta">
              {teamCode ? (
                <Link to="/game" className="btn btn-execute btn-lg">
                  ▶ RESUME MISSION [{teamCode}]
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    ◈ ENLIST YOUR TEAM
                  </Link>
                  <Link to="/team" className="btn btn-recon btn-lg">
                    ◉ ACCESS WITH CODE
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Tactical grid decoration */}
          <div className="hero-grid" aria-hidden="true">
            <div className="grid-cell" />
            <div className="grid-cell" />
            <div className="grid-cell" />
            <div className="grid-cell" />
          </div>
        </section>

        {/* Mission briefing */}
        <section className="briefing-section">
          <div className="section-header">
            <span className="label-telemetry text-gold">◈ MISSION BRIEFING</span>
            <span className="reticle-line" />
          </div>

          <div className="briefing-grid">
            {[
              { num: '01', label: 'REGISTER', desc: 'Form your operative unit. Register your team with your crew details to receive your classified access code.' },
              { num: '02', label: 'DECODE',   desc: 'Each clue contains encrypted coordinates and riddles. Solve them to discover the next waypoint location.' },
              { num: '03', label: 'PROVE',    desc: 'At each location, capture photographic proof. Submit it for organiser verification before the next clue unlocks.' },
              { num: '04', label: 'CONQUER',  desc: 'Complete all stages before rival teams. Highest score with fastest completion wins the trail.' },
            ].map(({ num, label, desc }) => (
              <div key={num} className="brief-card card">
                <div className="brief-num text-gold label-telemetry">{num}</div>
                <h3 className="headline-md mt-md">{label}</h3>
                <p className="body-sm text-muted mt-md">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="links-section">
          <div className="links-grid">
            <Link to="/leaderboard" className="quick-link card">
              <span className="ql-icon text-gold">★</span>
              <span className="headline-md">STANDINGS</span>
              <span className="body-sm text-muted">View live team rankings</span>
            </Link>
            <Link to="/admin" className="quick-link card">
              <span className="ql-icon text-muted">◈</span>
              <span className="headline-md">COMMAND</span>
              <span className="body-sm text-muted">Organiser admin panel</span>
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        .home-page { padding-top: 0; }

        /* Hero */
        .hero-section {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: var(--space-2xl) 0;
          position: relative;
        }
        .hero-coord-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .hero-content { max-width: 640px; }
        .hero-badge { margin-bottom: var(--space-lg); }
        .hero-title {
          margin-bottom: var(--space-lg);
          line-height: 1.0;
        }
        .hero-subtitle {
          margin-bottom: var(--space-xl);
          max-width: 480px;
        }
        .hero-cta { display: flex; gap: var(--space-md); flex-wrap: wrap; }

        /* Decorative grid */
        .hero-grid {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          opacity: 0.15;
          pointer-events: none;
        }
        .grid-cell {
          width: 120px;
          height: 120px;
          border: 1px solid var(--amber);
        }
        @media (max-width: 768px) { .hero-grid { display: none; } }

        /* Briefing */
        .briefing-section { padding: var(--space-2xl) 0; }
        .briefing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-md);
          margin-top: var(--space-lg);
        }
        .brief-card { }
        .brief-num { font-size: 1.5rem; }
        .mt-md { margin-top: var(--space-md); }

        /* Links */
        .links-section { padding-bottom: var(--space-2xl); }
        .links-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        @media (max-width: 480px) { .links-grid { grid-template-columns: 1fr; } }
        .quick-link {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          text-decoration: none;
          color: var(--on-surface);
          transition: border-color var(--transition), box-shadow var(--transition);
          padding: var(--space-xl) var(--space-lg);
        }
        .quick-link:hover {
          border-color: var(--amber);
          box-shadow: 0 0 16px rgba(229,169,60,0.1);
          color: var(--on-surface);
        }
        .ql-icon { font-size: 1.5rem; }
      `}</style>
    </MainLayout>
  );
}
