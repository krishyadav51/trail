import { useState } from 'react';
import { uploadUrl, driveFileUrl } from '../services/api';
import Modal from './Modal';

/**
 * SubmissionCard — shows a pending submission with approve/reject controls.
 * Renders the participant's submitted proof(s) inline — supports 1 or 2
 * images per submission, each with a download link (and Drive link when
 * the file has been synced to the team's Google Drive folder).
 */

// "125000" ms -> "2m 05s"
const formatElapsed = (ms) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return null;
  const total = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins === 0 ? `${secs}s` : `${mins}m ${String(secs).padStart(2, '0')}s`;
};
export default function SubmissionCard({ submission, onApprove, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [failed, setFailed]                   = useState({}); // index → true

  const {
    _id,
    team:   teamInfo,     // populated: { teamName, teamCode }
    clue:   clueInfo,     // populated: { stage, title, points }
    stage,
    proof,
    driveFileIds,
    driveLinks,
    driveFileId,          // legacy single-file fields
    driveLink,
    submittedAt,
    unlockedAt,
  } = submission;

  const teamName  = teamInfo?.teamName  || 'Unknown team';
  const teamCode  = teamInfo?.teamCode  || '—';
  const clueTitle = clueInfo?.title     || `Stage ${stage ?? '—'}`;

  // Normalise proof into an array (new records store 1–2 paths; old ones a single string)
  const proofs = Array.isArray(proof)
    ? proof.filter(Boolean)
    : proof
        ? [proof]
        : [];

  const proofSrcs   = proofs.map(uploadUrl);
  const driveUrls   = (driveFileIds?.length
    ? driveFileIds
    : driveFileId
        ? [driveFileId]
        : []
  ).map(driveFileUrl);
  const driveLinkUrls = (driveLinks?.length
    ? driveLinks
    : driveLink
        ? [driveLink]
        : []
  ).filter(Boolean);
  const anyLoaded = proofSrcs.some((src, i) => src && !failed[i]);

  // Live "time on the clock" while the submission waits for review
  const timeWaiting = unlockedAt
    ? formatElapsed(new Date() - new Date(unlockedAt))
    : null;

  const handleApprove = async () => {
    setLoading(true);
    await onApprove?.(_id);
    setLoading(false);
  };

  const handleRejectSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onReject?.(_id, reason.trim());
    setLoading(false);
    setShowRejectModal(false);
    setReason('');
  };

  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleString('en-IN', { hour12: false })
    : '—';

  const markFailed = (index) =>
    setFailed((prev) => ({ ...prev, [index]: true }));

  return (
    <>
      <div className="submission-card card animate-fade-in">
        {/* Header */}
        <div className="submission-header">
          <div>
            <p className="label-coord">STAGE {stage ?? clueInfo?.stage ?? '—'} // {clueTitle}</p>
            <h3 className="headline-md mt-xs">{teamName}</h3>
            <p className="body-sm text-muted text-mono">[{teamCode}]</p>
          </div>
          <div className="submission-time">
            <span className="label-coord">SUBMITTED</span>
            <span className="body-sm text-mono">{formattedTime}</span>
            {timeWaiting && (
              <span
                className="label-coord time-waiting"
                title="Time since the team unlocked this clue (measured at page load)"
              >
                ⏱ {timeWaiting}
              </span>
            )}
            {proofs.length > 1 && (
              <span className="label-coord proof-count-badge">
                {proofs.length} IMAGES
              </span>
            )}
          </div>
        </div>

        {/* Proofs — participant's uploaded images (1 or 2) */}
        <div className="submission-proof">
          <p className="label-coord mb-sm">◈ SUBMITTED PROOF{proofs.length > 1 ? 'S' : ''}</p>

          {proofSrcs.length === 0 ? (
            <div className="alert alert-error">No proof image was submitted.</div>
          ) : (
            <div className="proof-gallery">
              {proofSrcs.map((src, index) => (
                <div key={src || index} className="proof-gallery-item">
                  <p className="label-coord proof-item-label">IMAGE {index + 1}</p>
                  {src && !failed[index] ? (
                    <>
                      <a href={src} target="_blank" rel="noopener noreferrer">
                        <img
                          src={src}
                          alt={`Proof ${index + 1} from ${teamName}`}
                          className="proof-thumb"
                          onError={() => markFailed(index)}
                        />
                      </a>
                      <div className="proof-actions-row">
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="btn btn-recon btn-sm"
                        >
                          ⬇ DOWNLOAD
                        </a>
                        {(driveUrls[index] || driveLinkUrls[index]) && (
                          <a
                            href={driveUrls[index] || driveLinkUrls[index]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="The same file in the team's Google Drive folder"
                          >
                            ⬚ OPEN IN DRIVE
                          </a>
                        )}
                        <span className="label-coord proof-file-hint">
                          {proofs[index].split('/').pop()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="alert alert-error">
                      Image {index + 1} could not be loaded.
                      {src && (
                        <a href={src} target="_blank" rel="noopener noreferrer">
                          {' '}Open file directly
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="submission-actions">
          <button
            className="btn btn-success"
            onClick={handleApprove}
            disabled={loading || !anyLoaded}
          >
            ✓ APPROVE
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowRejectModal(true)}
            disabled={loading}
          >
            ✕ REJECT
          </button>
        </div>
      </div>

      {/* Rejection modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="REJECTION REASON"
      >
        <p className="body-sm text-muted mb-md">
          Enter the reason for rejecting this submission. The team will see this message.
        </p>
        <div className="input-group">
          <label className="input-label" htmlFor="reject-reason">REASON</label>
          <textarea
            id="reject-reason"
            className="input-field"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Image is blurry, wrong location..."
            style={{ resize: 'vertical', minHeight: '100px' }}
          />
        </div>
        <div className="flex gap-sm mt-md">
          <button
            className="btn btn-danger btn-full"
            onClick={handleRejectSubmit}
            disabled={!reason.trim() || loading}
          >
            {loading ? 'REJECTING...' : '✕ CONFIRM REJECT'}
          </button>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => setShowRejectModal(false)}
            disabled={loading}
          >
            CANCEL
          </button>
        </div>
      </Modal>

      <style>{`
        .submission-card { }
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .mb-sm { margin-bottom: var(--space-sm); }
        .mb-md { margin-bottom: var(--space-md); }
        .mt-md { margin-top: var(--space-md); }
        .submission-time {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }
        .proof-count-badge {
          color: var(--amber);
          margin-top: 4px;
        }
        .time-waiting {
          color: var(--primary-bright);
          margin-top: 4px;
        }
        .submission-proof {
          margin-bottom: var(--space-md);
        }
        .proof-gallery {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .proof-gallery-item { display: flex; flex-direction: column; }
        .proof-item-label { margin-bottom: var(--space-xs); color: var(--outline); }
        .proof-thumb {
          width: 100%;
          max-height: 240px;
          object-fit: contain;
          border: 1px solid var(--outline-variant);
          background: var(--surface-dim);
          cursor: pointer;
          transition: border-color var(--transition);
        }
        .proof-thumb:hover { border-color: var(--amber); }
        .proof-actions-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-top: var(--space-sm);
          flex-wrap: wrap;
        }
        .proof-file-hint {
          color: var(--outline);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .submission-actions {
          display: flex;
          gap: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--outline-variant);
        }
      `}</style>
    </>
  );
}
