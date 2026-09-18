import { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LeaderboardTable from '../../components/LeaderboardTable';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';
import { teamApi } from '../../services/api';

export default function AdminLeaderboard() {
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teamApi.leaderboard();
      const rows = res.data.leaderboard || res.data.teams || [];
      setTeams(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  // Auto-refresh every 15s for admin view
  useEffect(() => {
    const id = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <AdminLayout>
      <div className="admin-lb animate-fade-in">
        <div className="admin-page-header">
          <div>
            <p className="label-coord">REAL-TIME STANDINGS</p>
            <h1 className="headline-lg mt-xs">LEADERBOARD</h1>
          </div>
          <div className="flex gap-sm align-center">
            <span className="label-coord text-muted">AUTO: 15s</span>
            <button className="btn btn-recon btn-sm" onClick={fetchLeaderboard} disabled={loading}>
              {loading ? '...' : '↺ REFRESH'}
            </button>
          </div>
        </div>

        {loading && !teams.length ? (
          <LoadingState message="LOADING STANDINGS..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchLeaderboard} />
        ) : (
          <div className="card">
            <LeaderboardTable teams={teams} />
          </div>
        )}
      </div>

      <style>{`
        .admin-lb { }
        .admin-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .align-center { align-items: center; }
      `}</style>
    </AdminLayout>
  );
}
