import { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';
import { adminApi, teamApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [allocMsg, setAllocMsg] = useState(null);
  const [allocLoading, setAllocLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, pendingRes] = await Promise.all([
        teamApi.leaderboard(),
        adminApi.pendingSubmissions(),
      ]);
      const teamRows   = teamsRes.data.leaderboard || teamsRes.data.teams || [];
      const pendingRows = pendingRes.data.submissions || [];
      const teams   = Array.isArray(teamRows) ? teamRows : [];
      const pending = Array.isArray(pendingRows) ? pendingRows : [];
      setStats({
        totalTeams: teams.length,
        pendingCount: pending.length,
        teams,
        driveConfigured: !!pendingRes.data.driveConfigured,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleAllocate = async () => {
    setAllocLoading(true);
    setAllocMsg(null);
    try {
      const res = await adminApi.allocateSets();
      setAllocMsg({ type: 'success', text: res.data?.message || 'Clue sets allocated successfully.' });
    } catch (err) {
      setAllocMsg({ type: 'error', text: err.message });
    } finally {
      setAllocLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('⚠ WARNING: This will RESET all clue set allocations. Continue?')) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await adminApi.resetSets();
      setResetMsg({ type: 'success', text: res.data?.message || 'Clue sets reset.' });
    } catch (err) {
      setResetMsg({ type: 'error', text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <AdminLayout><LoadingState /></AdminLayout>;
  if (error)   return <AdminLayout><ErrorMessage message={error} onRetry={fetchStats} /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-dash animate-fade-in">
        <div className="admin-page-header">
          <div>
            <p className="label-coord">COMMAND OVERVIEW</p>
            <h1 className="headline-lg mt-xs">DASHBOARD</h1>
          </div>
          <div className="flex gap-sm align-center">
            {stats?.driveConfigured === false && (
              <span
                className="chip chip-pending drive-offline-chip"
                title="Google Drive is not configured — proofs are saved only in server/uploads. Add GOOGLE_SERVICE_ACCOUNT_JSON to server/.env (see server/.env.example)."
              >
                <span className="chip-dot" />
                ☁ DRIVE OFFLINE — PROOFS SAVED LOCALLY ONLY
              </span>
            )}
            <button className="btn btn-recon btn-sm" onClick={fetchStats}>↺ REFRESH</button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid">
          {[
            { label: 'TOTAL TEAMS',      value: stats?.totalTeams  ?? 0, icon: '◉', color: 'var(--primary-bright)' },
            { label: 'PENDING REVIEWS',  value: stats?.pendingCount ?? 0, icon: '◌', color: 'var(--warning)' },
            { label: 'ACTIVE MISSIONS',  value: stats?.teams?.filter(t => t.status === 'active' && t.startedAt).length ?? 0, icon: '▶', color: 'var(--success)' },
            { label: 'COMPLETED',        value: stats?.teams?.filter(t => t.status === 'completed').length ?? 0, icon: '★', color: 'var(--amber)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card card">
              <span className="stat-icon" style={{ color }}>{icon}</span>
              <div className="stat-info">
                <span className="label-coord">{label}</span>
                <span className="stat-num" style={{ color }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="quick-actions">
          {/* Allocate sets */}
          <div className="action-card card">
            <div className="action-card-header">
              <span className="label-telemetry text-gold">◈ CLUE SET ALLOCATION</span>
            </div>
            <p className="body-sm text-muted mt-sm">
              Assigns randomised clue sets to all registered teams. Run this once before the game starts.
            </p>
            {allocMsg && (
              <div className={`alert mt-md alert-${allocMsg.type}`}>{allocMsg.text}</div>
            )}
            <button
              className="btn btn-primary mt-md"
              onClick={handleAllocate}
              disabled={allocLoading}
            >
              {allocLoading ? 'ALLOCATING...' : '◈ ALLOCATE CLUE SETS'}
            </button>
          </div>

          {/* Reset sets — dev action */}
          <div className="action-card card" style={{ borderColor: 'var(--hazard)', opacity: 0.85 }}>
            <div className="action-card-header">
              <span className="label-telemetry text-hazard">⚠ DEV / TESTING ONLY</span>
            </div>
            <p className="body-sm text-muted mt-sm">
              Resets all clue set allocations. This is destructive and should only be used during development or testing.
            </p>
            {resetMsg && (
              <div className={`alert mt-md alert-${resetMsg.type}`}>{resetMsg.text}</div>
            )}
            <button
              className="btn btn-execute mt-md"
              onClick={handleReset}
              disabled={resetLoading}
            >
              {resetLoading ? 'RESETTING...' : '✕ RESET CLUE SETS'}
            </button>
          </div>
        </div>

        {/* Quick nav */}
        <div className="nav-cards">
          <a href="/admin/submissions" className="nav-card card">
            <span className="nav-icon text-warning">◌</span>
            <span className="headline-md">PENDING SUBMISSIONS</span>
            <span className="body-sm text-muted">{stats?.pendingCount} awaiting review</span>
          </a>
          <a href="/admin/teams" className="nav-card card">
            <span className="nav-icon text-gold">◉</span>
            <span className="headline-md">TEAM MANAGEMENT</span>
            <span className="body-sm text-muted">Start / view teams</span>
          </a>
          <a href="/admin/leaderboard" className="nav-card card">
            <span className="nav-icon" style={{ color: 'var(--amber)' }}>★</span>
            <span className="headline-md">LEADERBOARD</span>
            <span className="body-sm text-muted">Full team rankings</span>
          </a>
        </div>
      </div>

      <style>{`
        .admin-dash { }
        .admin-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-xl);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .align-center { align-items: center; }
        .drive-offline-chip { cursor: help; }
        .mt-sm { margin-top: var(--space-sm); }
        .mt-md { margin-top: var(--space-md); }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
        }
        .stat-icon { font-size: 1.5rem; }
        .stat-info { display: flex; flex-direction: column; gap: 2px; }
        .stat-num {
          font-family: var(--font-headline);
          font-size: 1.75rem;
          font-weight: 800;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        @media (max-width: 640px) { .quick-actions { grid-template-columns: 1fr; } }
        .action-card { }
        .action-card-header { margin-bottom: var(--space-sm); }

        .nav-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-md);
        }
        .nav-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          text-decoration: none;
          color: var(--on-surface);
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .nav-card:hover {
          border-color: var(--amber);
          box-shadow: 0 0 12px rgba(229,169,60,0.1);
          color: var(--on-surface);
        }
        .nav-icon { font-size: 1.5rem; }
        .text-warning { color: var(--warning); }
      `}</style>
    </AdminLayout>
  );
}
