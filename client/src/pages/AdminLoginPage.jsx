import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { adminApi } from '../services/api';

const ADMIN_TOKEN_KEY = 'tos_admin_token';

const hasValidAdminToken = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return false;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload?.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';
  const [form, setForm] = useState({
    teamName: '',
    teamLeader: '',
    leaderRegNo: '',
    email: '',
    teamMember: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (hasValidAdminToken()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.login(form);
      localStorage.setItem(ADMIN_TOKEN_KEY, response.data.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to verify admin access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="admin-login page-container animate-fade-in">
        <form className="admin-login-card card card-elevated" onSubmit={handleSubmit} noValidate>
          {sessionExpired && (
            <div className="alert alert-warning">
              ⏱ Your admin session has expired. Please sign in again.
            </div>
 )}
          <p className="label-coord text-gold">COMMAND AUTHENTICATION</p>
          <h1 className="headline-lg mt-sm">ADMIN PORTAL</h1>
          <p className="body-sm text-muted mt-md">
            Enter the authorised team details to open the command terminal.
          </p>

          <div className="input-group">
            <label className="input-label" htmlFor="admin-team-name">TEAM NAME</label>
            <input id="admin-team-name" className="input-field" required value={form.teamName}
              onChange={(e) => setForm({ ...form, teamName: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="admin-team-leader">TEAM LEADER</label>
            <input id="admin-team-leader" className="input-field" required value={form.teamLeader}
              onChange={(e) => setForm({ ...form, teamLeader: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="admin-leader-regno">LEADER REGISTER NUMBER</label>
            <input id="admin-leader-regno" className="input-field" required value={form.leaderRegNo}
              onChange={(e) => setForm({ ...form, leaderRegNo: e.target.value.toUpperCase() })}
              style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="admin-email">EMAIL</label>
            <input id="admin-email" type="email" className="input-field" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="admin-member">TEAM MEMBER REGISTER NUMBER</label>
            <input id="admin-member" className="input-field" required value={form.teamMember}
              onChange={(e) => setForm({ ...form, teamMember: e.target.value.toUpperCase() })} />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-execute btn-full btn-lg" disabled={loading}>
            {loading ? 'VERIFYING...' : '▶ OPEN ADMIN PORTAL'}
          </button>
        </form>
      </div>
      <style>{`
        .admin-login { min-height: 72vh; display: flex; align-items: center; justify-content: center; }
        .admin-login-card { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--space-md); }
        .admin-login-card .input-group { margin: 0; }
        .mt-sm { margin-top: var(--space-sm); }
        .mt-md { margin-top: var(--space-md); }
      `}</style>
    </MainLayout>
  );
}
