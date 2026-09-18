import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';
import { adminApi, driveFolderUrl } from '../../services/api';

/**
 * AdminTeams — full team management:
 * start / block / unblock / disqualify / reset / delete.
 */
export default function AdminTeams() {
  const navigate          = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [busyCode, setBusyCode]   = useState(null);

  // Modals
  const [confirmAction, setConfirmAction] = useState(null); // { type, team }
  const [blockModal, setBlockModal]       = useState(null); // { team }
  const [blockReason, setBlockReason]     = useState('');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.allTeams();
      setTeams(res.data.teams || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const runAction = async (code, action, payload) => {
    setBusyCode(code);
    setActionMsg(null);
    try {
      const res = await action(code, payload);
      setActionMsg({ type: 'success', text: res.data?.message || 'Done.' });
      await fetchTeams();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
      throw err; // let modal handlers decide
    } finally {
      setBusyCode(null);
    }
  };

  const handleStart = async (team) => {
    if (!window.confirm(
      `START the game for "${team.teamName}"?\n\n` +
      'This unlocks Clue 0 and starts their run. It can only be done once.'
    )) return;

    try {
      await runAction(team.teamCode, adminApi.startTeam);
    } catch { /* message already shown */ }
  };

  const handleBlock = async () => {
    if (!blockModal) return;
    try {
      await runAction(blockModal.team.teamCode, adminApi.blockTeam, blockReason.trim());
      setBlockModal(null);
      setBlockReason('');
    } catch { /* keep modal open on error */ }
  };

  const handleUnblock = async (team) => {
    try {
      await runAction(team.teamCode, adminApi.unblockTeam);
    } catch { /* message already shown */ }
  };

  const handleDisqualify = async (team) => {
    try {
      await runAction(team.teamCode, adminApi.disqualifyTeam, 'Disqualified by admin');
      setConfirmAction(null);
    } catch { /* keep modal open */ }
  };

  const handleReset = async (team) => {
    try {
      await runAction(team.teamCode, adminApi.resetTeam);
      setConfirmAction(null);
    } catch { /* keep modal open */ }
  };

  const handleDelete = async (team) => {
    try {
      await runAction(team.teamCode, adminApi.deleteTeam);
      setConfirmAction(null);
    } catch { /* keep modal open */ }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { hour12: false, dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <AdminLayout>
      <div className="admin-teams animate-fade-in">
        <div className="admin-page-header">
          <div>
            <p className="label-coord">OPERATIVE MANAGEMENT</p>
            <h1 className="headline-lg mt-xs">TEAMS</h1>
          </div>
          <div className="flex gap-sm align-center">
            <span className="chip chip-pending">
              <span className="chip-dot" />
              {teams.length} TEAMS
            </span>
            <button className="btn btn-recon btn-sm" onClick={fetchTeams} disabled={loading}>
              ↺ REFRESH
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className={`alert alert-${actionMsg.type} mb-lg`} role="status">
            {actionMsg.text}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setActionMsg(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="info-strip card mb-lg">
          <span className="label-coord text-gold">◈ WORKFLOW</span>
          <p className="body-sm text-muted">
            1. ALLOCATE CLUE SETS (Dashboard) → 2. START each team here → the team enters
            their code at <button className="link-btn" onClick={() => navigate('/team')}>/team</button> and
            begins Clue 0. START is one-time per team; BLOCK freezes them; DELETE removes
            the team and every proof they submitted.
          </p>
        </div>

        {/* Team list */}
        {loading ? (
          <LoadingState message="LOADING TEAM ROSTER..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchTeams} />
        ) : teams.length === 0 ? (
          <div className="empty-state card">
            <p className="label-telemetry text-muted">NO TEAMS REGISTERED YET</p>
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TEAM</th>
                  <th>CODE</th>
                  <th>SET</th>
                  <th>SCORE</th>
                  <th>BONUS</th>
                  <th>REJECTS</th>
                  <th>STAGE</th>
                  <th>STARTED</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const busy = busyCode === team.teamCode;
                  const isBlocked = team.status === 'blocked';
                  const isDQ = team.status === 'disqualified';
                  const started = !!team.startedAt;
                  const completed = team.status === 'completed';

                  return (
                    <tr key={team.teamCode} className={isBlocked || isDQ ? 'row-dimmed' : ''}>
                      <td>
                        <span className="team-name">{team.teamName}</span>
                        <span className="body-sm text-muted leader-line">
                          {team.leader?.name} · {team.leader?.registerNumber}
                        </span>
                      </td>
                      <td>
                        <span className="text-mono body-sm text-gold">{team.teamCode}</span>
                      </td>
                      <td>
                        {team.clueSet ? (
                          <span className={`chip chip-set chip-${team.clueSet}`}>
                            <span className="chip-dot" />
                            {team.clueSet.replace('set', 'SET ')}
                          </span>
                        ) : (
                          <span className="body-sm text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="body-sm text-mono">{team.score ?? 0}</span>
                        {driveFolderUrl(team.driveFolderId) && (
                          <a
                            className="drive-link"
                            href={driveFolderUrl(team.driveFolderId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open this team's proof folder in Google Drive"
                          >
                            ⬚ DRIVE
                          </a>
                        )}
                      </td>
                      <td>
                        <span
                          className={`body-sm text-mono ${team.bonusPoints > 0 ? 'bonus-hot' : 'text-muted'}`}
                          title={team.bonusPoints > 0 ? `First-to-reach bonuses won: +${team.bonusPoints} total` : 'No first-to-reach bonuses yet'}
                        >
                          {team.bonusPoints > 0 ? `+${team.bonusPoints}` : 0}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`body-sm text-mono ${team.rejectionCount > 0 ? 'rejects-hot' : 'text-muted'}`}
                          title={team.rejectionCount > 0 ? 'Total proof rejections across all stages' : 'No rejections'}
                        >
                          {team.rejectionCount ?? 0}
                        </span>
                      </td>
                      <td>{team.startedAt ? (completed ? '✓ DONE' : team.currentStage ?? 0) : '—'}</td>
                      <td>
                        <span className="body-sm text-mono">{fmtDate(team.startedAt)}</span>
                      </td>
                      <td>
                        <span className={`chip chip-${team.status || 'active'}`}>
                          <span className="chip-dot" />
                          {(team.status || 'ACTIVE').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {!started && !isBlocked && !isDQ && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStart(team)}
                              disabled={busy || !team.clueSet}
                              title={!team.clueSet ? 'Allocate clue sets first (Dashboard)' : 'Unlock Clue 0 for this team'}
                            >
                              ▶ START
                            </button>
                          )}
                          {started && !completed && (
                            <span className="label-coord started-tag">RUNNING</span>
                          )}
                          {completed && (
                            <span className="label-coord started-tag text-gold">★ FINISHED</span>
                          )}

                          {isBlocked ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleUnblock(team)}
                              disabled={busy}
                            >
                              ✓ UNBLOCK
                            </button>
                          ) : (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setBlockModal(team); setBlockReason(''); }}
                              disabled={busy || isDQ}
                            >
                              ⛔ BLOCK
                            </button>
                          )}

                          {!isDQ && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmAction({ type: 'disqualify', team })}
                              disabled={busy || isBlocked}
                            >
                              ✕ DQ
                            </button>
                          )}

                          <button
                            className="btn btn-recon btn-sm"
                            onClick={() => setConfirmAction({ type: 'reset', team })}
                            disabled={busy || !started}
                            title="Reset score, stage and progress"
                          >
                            ↺ RESET
                          </button>

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmAction({ type: 'delete', team })}
                            disabled={busy}
                          >
                            🗑 DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Block modal — asks for a reason */}
      <Modal
        isOpen={!!blockModal}
        onClose={() => setBlockModal(null)}
        title={`BLOCK ${blockModal?.teamName || ''}`}
      >
        <p className="body-sm text-muted mb-md">
          The team will immediately be locked out of the game. You can unblock them at
          any time.
        </p>
        <div className="input-group">
          <label className="input-label" htmlFor="block-reason">REASON (shown in their error)</label>
          <input
            id="block-reason"
            className="input-field"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="E.g. caught sharing answers"
          />
        </div>
        <div className="flex gap-sm mt-md">
          <button className="btn btn-danger btn-full" onClick={handleBlock} disabled={busyCode}>
            ⛔ CONFIRM BLOCK
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setBlockModal(null)}>
            CANCEL
          </button>
        </div>
      </Modal>

      {/* Disqualify / reset / delete confirmation */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type?.toUpperCase() || ''}
      >
        {confirmAction?.type === 'disqualify' && (
          <>
            <p className="body-sm text-muted mb-md">
              Disqualify <strong>{confirmAction.team.teamName}</strong>? They will be
              hidden from the leaderboard and locked out. This does not delete their data.
            </p>
            <div className="flex gap-sm">
              <button className="btn btn-danger btn-full" onClick={() => handleDisqualify(confirmAction.team)} disabled={busyCode}>
                ✕ CONFIRM DQ
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmAction(null)}>CANCEL</button>
            </div>
          </>
        )}
        {confirmAction?.type === 'reset' && (
          <>
            <p className="body-sm text-muted mb-md">
              Reset <strong>{confirmAction.team.teamName}</strong> to Stage 0 with score 0?
              All submitted proofs and progress for this team will be erased.
            </p>
            <div className="flex gap-sm">
              <button className="btn btn-execute btn-full" onClick={() => handleReset(confirmAction.team)} disabled={busyCode}>
                ↺ CONFIRM RESET
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmAction(null)}>CANCEL</button>
            </div>
          </>
        )}
        {confirmAction?.type === 'delete' && (
          <>
            <p className="body-sm text-muted mb-md">
              ⚠ Permanently delete <strong>{confirmAction.team.teamName}</strong>?
              Their progress and all submitted proofs are removed. This cannot be undone.
            </p>
            {driveFolderUrl(confirmAction.team.driveFolderId) && (
              <p className="body-sm text-muted mb-md drive-note">
                ⬚ Their Google Drive folder is kept as an archive —
                {' '}<a href={driveFolderUrl(confirmAction.team.driveFolderId)} target="_blank" rel="noopener noreferrer">open it</a> to
                download or delete it yourself.
              </p>
            )}
            <div className="flex gap-sm">
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(confirmAction.team)} disabled={busyCode}>
                🗑 DELETE FOREVER
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmAction(null)}>CANCEL</button>
            </div>
          </>
        )}
      </Modal>

      <style>{`
        .admin-teams { }
        .admin-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .mt-xs  { margin-top: var(--space-xs); }
        .mb-lg  { margin-bottom: var(--space-lg); }
        .mt-md  { margin-top: var(--space-md); }
        .align-center { align-items: center; }
        .info-strip { padding: var(--space-md) var(--space-lg); }
        .link-btn {
          background: none;
          border: none;
          color: var(--amber);
          font: inherit;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        .table-scroll { overflow-x: auto; }
        .team-name {
          display: block;
          font-family: var(--font-headline);
          font-weight: 700;
        }
        .leader-line { display: block; }
        .row-dimmed { opacity: 0.55; }
        .row-actions {
          display: flex;
          gap: var(--space-xs);
          flex-wrap: wrap;
          align-items: center;
        }
        .started-tag { color: var(--success); }
        .empty-state { padding: var(--space-2xl); text-align: center; }
        .drive-link {
          display: inline-block;
          margin-left: var(--space-sm);
          color: var(--amber);
          text-decoration: none;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .drive-link:hover { text-decoration: underline; }
        .drive-note a { color: var(--amber); }
        .rejects-hot { color: var(--danger, #ff5a5a); font-weight: 700; }
        .bonus-hot { color: var(--success, #4ade80); font-weight: 700; }
        .chip-set { font-size: 11px; }
        .chip-set1 .chip-dot { background: #e5a93c; }
        .chip-set2 .chip-dot { background: #4ea3ff; }
        .chip-set3 .chip-dot { background: #9d7bff; }
      `}</style>
    </AdminLayout>
  );
}
