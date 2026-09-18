import { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import LeaderboardTable from '../components/LeaderboardTable';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import { teamApi } from '../services/api';

export default function LeaderboardPage() {
  const [teams, setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teamApi.leaderboard();
      // API returns { leaderboard: [...] } — never the raw object
      const rows = res.data.leaderboard || res.data.teams || [];
      setTeams(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <MainLayout>
      <div className="lb-page page-container animate-fade-in">
        <div className="lb-header section-header">
          <div>
            <p className="label-coord">REAL-TIME INTELLIGENCE</p>
            <h1 className="headline-lg mt-xs">OPERATIVE STANDINGS</h1>
          </div>
          <div className="lb-controls">
            <span className="label-coord text-muted">AUTO-REFRESH: 30s</span>
            <button className="btn btn-recon btn-sm" onClick={fetchLeaderboard} disabled={loading}>
              {loading ? '...' : '↺ REFRESH'}
            </button>
          </div>
        </div>

        {loading && !teams.length ? (
          <LoadingState message="LOADING FIELD INTELLIGENCE..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchLeaderboard} />
        ) : (
          <>
            {/* Top 3 podium */}
            {teams.length >= 3 && (
              <div className="podium animate-fade-in">
                {[
                  { rank: 2, team: teams[1], height: '100px', color: '#c0c0c0' },
                  { rank: 1, team: teams[0], height: '140px', color: 'var(--primary-bright)' },
                  { rank: 3, team: teams[2], height: '80px',  color: '#cd7f32' },
                ].map(({ rank, team, height, color }) => (
                  <div key={rank} className="podium-slot">
                    <div className="podium-name" style={{ color }}>
                      {team.teamName}
                    </div>
                    <div className="podium-score" style={{ color }}>{team.score ?? 0}</div>
                    <div className="podium-base" style={{ height, borderColor: color }}>
                      <span className="podium-rank" style={{ color }}>#{rank}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card mt-lg">
              <LeaderboardTable teams={teams} />
            </div>
          </>
        )}
      </div>

      <style>{`
        .lb-page { }
        .mt-xs { margin-top: var(--space-xs); }
        .mt-lg { margin-top: var(--space-lg); }
        .lb-header { margin-bottom: var(--space-xl); }
        .lb-controls { display: flex; align-items: center; gap: var(--space-md); }

        /* Podium */
        .podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
          padding: var(--space-lg);
          background: var(--surface-low);
          border: 1px solid var(--outline-variant);
        }
        .podium-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          flex: 1;
          max-width: 200px;
        }
        .podium-name {
          font-family: var(--font-headline);
          font-size: 0.875rem;
          font-weight: 700;
          text-align: center;
        }
        .podium-score {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
        }
        .podium-base {
          width: 100%;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.02);
        }
        .podium-rank {
          font-family: var(--font-headline);
          font-size: 1.5rem;
          font-weight: 800;
        }
        @media (max-width: 480px) { .podium { display: none; } }
      `}</style>
    </MainLayout>
  );
}
