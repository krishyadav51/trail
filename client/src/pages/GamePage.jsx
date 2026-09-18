import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useTeamCode } from '../hooks/useTeamCode';
import { useClue } from '../hooks/useClue';
import ClueCard from '../components/ClueCard';
import ProofUpload from '../components/ProofUpload';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import SessionTimer from '../components/SessionTimer';

export default function GamePage() {
  const { teamCode, expiresAt, clearTeamCode } = useTeamCode();
  const navigate     = useNavigate();

  const handleSessionExpired = useCallback(() => {
    clearTeamCode();
    navigate('/team?expired=1', { replace: true });
  }, [clearTeamCode, navigate]);

  // Redirect to login if no team code
  useEffect(() => {
    if (!teamCode) navigate('/team', { replace: true });
  }, [teamCode, navigate]);

  const { clueData, loading, error, refetch } = useClue(teamCode);

  if (!teamCode) return null;

  if (loading && !clueData) {
    return (
      <MainLayout>
        <LoadingState message="RETRIEVING COORDINATES..." />
      </MainLayout>
    );
  }

  if (error && !clueData) {
    return (
      <MainLayout>
        <div className="game-page page-container">
          <ErrorMessage message={error} onRetry={refetch} />
        </div>
      </MainLayout>
    );
  }

  // Destructure backend response
  const { team, clue, progress, completed } = clueData || {};
  const status = progress?.status;

  // Completion screen
  if (completed) {
    return (
      <MainLayout>
        <div className="game-page page-container">
          <div className="completion-screen animate-fade-in">
            <div className="completion-icon">★</div>
            <h1 className="display-lg text-gold">MISSION COMPLETE</h1>
            <p className="body-lg text-muted mt-md">
              Outstanding field work, {team?.teamName}. All coordinates have been
              decrypted and verified. You have completed the Trail of Secret.
            </p>
            {team?.score !== undefined && (
              <div className="completion-score">
                <span className="label-coord">FINAL SCORE</span>
                <span className="score-num">{team.score}</span>
              </div>
            )}
            <a href="/leaderboard" className="btn btn-primary btn-lg mt-lg">
              ★ VIEW LEADERBOARD
            </a>
          </div>
        </div>

        <style>{`
          .completion-screen {
            text-align: center;
            padding: var(--space-2xl) var(--space-lg);
            max-width: 600px;
            margin: 0 auto;
          }
          .completion-icon {
            font-size: 4rem;
            color: var(--primary-bright);
            margin-bottom: var(--space-lg);
            animation: pulse-gold 2s ease infinite;
          }
          .mt-md { margin-top: var(--space-md); }
          .mt-lg { margin-top: var(--space-lg); }
          .completion-score {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-xs);
            margin: var(--space-xl) 0;
            padding: var(--space-lg);
            border: 1px solid var(--primary-bright);
            background: rgba(245,197,24,0.06);
          }
          .score-num {
            font-family: var(--font-headline);
            font-size: 3rem;
            font-weight: 800;
            color: var(--primary-bright);
          }
        `}</style>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="game-page page-container animate-fade-in">
        {/* Team info bar */}
        {team && (
          <div className="team-info-bar">
            <div className="tib-left">
              <span className="label-coord">OPERATIVE: </span>
              <span className="headline-md text-gold">{team.teamName}</span>
            </div>
            <div className="tib-right">
              <div className="tib-stat">
                <span className="label-coord">CODE</span>
                <span className="body-sm text-mono text-gold">{teamCode}</span>
              </div>
              <div className="tib-divider" />
              <div className="tib-stat">
                <span className="label-coord">SCORE</span>
                <span className="body-sm text-gold">{team.score ?? 0}</span>
              </div>
              <div className="tib-divider" />
              <div className="tib-stat">
                <span className="label-coord">STAGE</span>
                <span className="body-sm">{clue?.stage ?? '—'}</span>
              </div>
              <div className="tib-divider" />
              <SessionTimer expiresAt={expiresAt} onExpire={handleSessionExpired} />
            </div>
          </div>
        )}

        <div className="game-layout">
          {/* Clue panel */}
          <div className="clue-panel">
            {clue ? (
              <ClueCard clue={clue} progress={progress} />
            ) : (
              <div className="card">
                <p className="label-telemetry text-muted">NO ACTIVE CLUE — GAME MAY NOT HAVE STARTED YET.</p>
              </div>
            )}
          </div>

          {/* Action panel */}
          <div className="action-panel">
            {status === 'unlocked' && (
              <div className="card animate-fade-in">
                <ProofUpload
                  teamCode={teamCode}
                  onSuccess={() => {
                    setTimeout(refetch, 500);
                  }}
                />
              </div>
            )}

            {status === 'pending' && (
              <div className="status-panel card animate-fade-in">
                <div className="status-icon pending-icon" aria-hidden="true">◌</div>
                <h3 className="headline-md">AWAITING VERIFICATION</h3>
                <p className="body-sm text-muted mt-sm">
                  Your proof has been submitted and is awaiting organiser review.
                  This page will automatically update when a decision is made.
                </p>
                <div className="scanning-bar mt-md">
                  <div className="scan-fill" />
                </div>
                <p className="label-coord mt-sm text-muted">AUTO-CHECKING EVERY 10 SECONDS</p>
                <button className="btn btn-ghost btn-sm mt-md" onClick={refetch}>
                  ↺ CHECK NOW
                </button>
              </div>
            )}

            {status === 'rejected' && (
              <div className="status-panel card animate-fade-in" style={{ borderColor: 'var(--hazard)' }}>
                <div className="status-icon rejected-icon" aria-hidden="true">✕</div>
                <h3 className="headline-md text-hazard">PROOF REJECTED</h3>
                {progress?.rejectionReason && (
                  <div className="alert alert-error mt-md">
                    {progress.rejectionReason}
                  </div>
                )}
                <p className="body-sm text-muted mt-sm">
                  Please review the reason above and resubmit your proof.
                </p>
                <div className="mt-lg">
                  <ProofUpload
                    teamCode={teamCode}
                    onSuccess={() => setTimeout(refetch, 500)}
                  />
                </div>
              </div>
            )}

            {status === 'approved' && (
              <div className="status-panel card animate-fade-in" style={{ borderColor: 'var(--primary-bright)' }}>
                <div className="status-icon approved-icon" aria-hidden="true">◈</div>
                <h3 className="headline-md text-gold">PROOF APPROVED</h3>
                <p className="body-sm text-muted mt-sm">
                  Your submission was approved. Loading next coordinate…
                </p>
                <button className="btn btn-primary btn-sm mt-md" onClick={refetch}>
                  ↺ LOAD NEXT CLUE
                </button>
              </div>
            )}

            {!status && !loading && (
              <div className="card">
                <p className="label-telemetry text-muted">GAME HAS NOT STARTED YET. STAND BY.</p>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="refresh-indicator label-coord text-muted">
            ↺ REFRESHING...
          </div>
        )}
      </div>

      <style>{`
        .game-page { }
        .team-info-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: var(--surface-low);
          border: 1px solid var(--outline-variant);
          margin-bottom: var(--space-lg);
        }
        .tib-left { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
        .tib-right { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; }
        .tib-stat { display: flex; flex-direction: column; gap: 1px; }
        .tib-divider { width: 1px; height: 24px; background: var(--outline-variant); }
        .session-timer {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
          padding: var(--space-xs) var(--space-sm);
          border: 1px solid var(--outline-variant);
        }
        .session-timer--urgent {
          border-color: var(--hazard);
          color: var(--hazard);
          animation: blink-cursor 1s ease infinite;
        }
        .mt-sm { margin-top: var(--space-sm); }
        .mt-md { margin-top: var(--space-md); }
        .mt-lg { margin-top: var(--space-lg); }

        .game-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: var(--space-lg);
          align-items: start;
        }
        @media (max-width: 900px) {
          .game-layout { grid-template-columns: 1fr; }
        }

        .status-panel { text-align: center; padding: var(--space-xl); }
        .status-icon {
          font-size: 2.5rem;
          margin-bottom: var(--space-md);
        }
        .pending-icon  { color: var(--warning); animation: blink-cursor 1.5s ease infinite; }
        .approved-icon { color: var(--primary-bright); }
        .rejected-icon { color: var(--hazard); }

        .scanning-bar {
          height: 2px;
          background: var(--outline-variant);
          overflow: hidden;
        }
        .scan-fill {
          height: 100%;
          width: 40%;
          background: var(--warning);
          animation: scan-fill-anim 2s ease-in-out infinite;
        }
        @keyframes scan-fill-anim {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }

        .refresh-indicator {
          margin-top: var(--space-md);
          text-align: right;
          animation: blink-cursor 1s ease infinite;
        }
      `}</style>
    </MainLayout>
  );
}
