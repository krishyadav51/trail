import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useTeamCode } from '../hooks/useTeamCode';
import { clueApi } from '../services/api';

export default function TeamLoginPage() {
  const { setTeamCode } = useTeamCode();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const sessionExpired  = searchParams.get('expired') === '1';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      // Verify the code by fetching the team's current clue
      await clueApi.getCurrent(trimmed);
      setTeamCode(trimmed);
      navigate('/game');
    } catch (err) {
      // Differentiate "not found" from server errors
      if (err.message?.toLowerCase().includes('not found') ||
          err.message?.toLowerCase().includes('invalid')) {
        setError('Team code not recognised. Check your code and try again.');
      } else {
        setError(err.message || 'Unable to verify team code.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="login-page page-container animate-fade-in">
        <div className="login-box">
          <div className="login-header">
            <span className="login-icon text-gold" aria-hidden="true">◉</span>
            <div>
              <p className="label-coord">SECURE CHANNEL ACCESS</p>
              <h1 className="headline-lg mt-xs">ENTER TEAM CODE</h1>
            </div>
          </div>

          {sessionExpired && (
            <div className="alert alert-warning">
              ⏱ Your 30-minute session has expired. Enter your team code again to continue.
            </div>
          )}

          <p className="body-sm text-muted login-desc">
            Enter your team's unique access code to enter the mission. Your code was
            generated when your team registered. Sessions last 30 minutes.
          </p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="input-group">
              <label className="input-label" htmlFor="team-code">ACCESS CODE</label>
              <input
                id="team-code"
                type="text"
                className={`input-field input-code ${error ? 'error' : ''}`}
                placeholder="TOS-XXXXXX"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                autoComplete="off"
                autoFocus
                required
                maxLength={20}
              />
              {error && <p className="field-error">{error}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-execute btn-full btn-lg"
              disabled={loading || !code.trim()}
            >
              {loading ? 'VERIFYING...' : '▶ ACCESS MISSION'}
            </button>
          </form>

          <div className="login-divider">
            <span className="reticle-line" />
            <span className="label-coord">OR</span>
            <span className="reticle-line" />
          </div>

          <a href="/register" className="btn btn-recon btn-full">
            ◈ REGISTER NEW TEAM
          </a>
        </div>
      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
        }
        .login-box {
          width: 100%;
          max-width: 440px;
          background: var(--surface-low);
          border: 1px solid var(--outline-variant);
          padding: var(--space-xl);
          position: relative;
        }
        .login-header {
          display: flex;
          align-items: flex-start;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .login-icon { font-size: 2rem; margin-top: 4px; }
        .mt-xs { margin-top: var(--space-xs); }
        .login-desc {
          margin-bottom: var(--space-xl);
          padding-bottom: var(--space-lg);
          border-bottom: 1px solid var(--outline-variant);
        }
        .login-form { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
        .input-code {
          font-size: 1.125rem;
          letter-spacing: 0.2em;
          text-align: center;
        }
        .login-divider {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
      `}</style>
    </MainLayout>
  );
}
