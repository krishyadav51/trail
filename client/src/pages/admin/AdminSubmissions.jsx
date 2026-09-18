import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import SubmissionCard from '../../components/SubmissionCard';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';
import { adminApi } from '../../services/api';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [actionMsg, setActionMsg]     = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.pendingSubmissions();
      setSubmissions(res.data.submissions || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (progressId) => {
    try {
      const res = await adminApi.approve(progressId);
      const timeText = res.data?.progress?.timeTakenText;
      setActionMsg({
        type: 'success',
        text: `Submission approved.${timeText ? ` Cleared in ${timeText}.` : ''} ${res.data?.message || ''}`.trim(),
      });
      fetchPending();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleReject = async (progressId, reason) => {
    try {
      await adminApi.reject(progressId, reason);
      setActionMsg({ type: 'success', text: 'Submission rejected.' });
      fetchPending();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <AdminLayout>
      <div className="admin-subs animate-fade-in">
        <div className="admin-page-header">
          <div>
            <p className="label-coord">FIELD EVIDENCE REVIEW</p>
            <h1 className="headline-lg mt-xs">PENDING SUBMISSIONS</h1>
          </div>
          <div className="flex gap-sm align-center">
            <span className="chip chip-pending">
              <span className="chip-dot" />
              {submissions.length} PENDING
            </span>
            <button className="btn btn-recon btn-sm" onClick={fetchPending} disabled={loading}>
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

        {loading && !submissions.length ? (
          <LoadingState message="RETRIEVING PENDING SUBMISSIONS..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchPending} />
        ) : submissions.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">◎</div>
            <p className="label-telemetry text-muted">NO PENDING SUBMISSIONS</p>
            <p className="body-sm text-muted mt-sm">
              All submissions have been reviewed. Check back when teams submit new proofs.
            </p>
          </div>
        ) : (
          <div className="submissions-grid">
            {submissions.map((sub) => (
              <SubmissionCard
                key={sub._id}
                submission={sub}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-subs { }
        .admin-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .mt-sm { margin-top: var(--space-sm); }
        .mb-lg { margin-bottom: var(--space-lg); }
        .align-center { align-items: center; }

        .submissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-md);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-2xl);
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--outline);
          margin-bottom: var(--space-md);
        }
      `}</style>
    </AdminLayout>
  );
}
