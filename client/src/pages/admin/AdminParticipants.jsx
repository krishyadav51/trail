import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingState from '../../components/LoadingState';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';
import { adminApi } from '../../services/api';

/**
 * AdminParticipants — manage the official participant register:
 * list, bulk add register numbers, delete (guarded when in a team).
 */
export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [actionMsg, setActionMsg]       = useState(null);
  const [busy, setBusy]                 = useState(false);

  // Add form
  const [addOpen, setAddOpen]     = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [search, setSearch] = useState('');

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.participants();
      setParticipants(res.data.participants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  const handleAdd = async () => {
    const numbers = bulkInput
      .split(/[\n,;\s]+/)
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean);

    if (numbers.length === 0) return;

    setBusy(true);
    setActionMsg(null);
    try {
      const res = await adminApi.addParticipants(numbers);
      setActionMsg({ type: 'success', text: res.data?.message });
      setBulkInput('');
      setAddOpen(false);
      fetchParticipants();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await adminApi.deleteParticipant(deleteTarget.registerNumber);
      setActionMsg({ type: 'success', text: res.data?.message });
      setDeleteTarget(null);
      fetchParticipants();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const filtered = participants.filter((p) =>
    p.registerNumber.toLowerCase().includes(search.trim().toLowerCase())
  );

  const inTeamCount = participants.filter((p) => p.inTeam).length;

  return (
    <AdminLayout>
      <div className="admin-participants animate-fade-in">
        <div className="admin-page-header">
          <div>
            <p className="label-coord">OFFICIAL REGISTER</p>
            <h1 className="headline-lg mt-xs">PARTICIPANTS</h1>
          </div>
          <div className="flex gap-sm align-center">
            <span className="chip chip-pending">
              <span className="chip-dot" />
              {participants.length} TOTAL
            </span>
            <span className="chip chip-approved">
              <span className="chip-dot" />
              {inTeamCount} IN TEAMS
            </span>
            <button className="btn btn-recon btn-sm" onClick={fetchParticipants} disabled={loading}>
              ↺ REFRESH
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className={`alert alert-${actionMsg.type} mb-lg`} role="status">
            {actionMsg.text}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setActionMsg(null)}>
              ✕
            </button>
          </div>
        )}

        <div className="toolbar mb-lg">
          <input
            type="text"
            className="input-field search-input"
            placeholder="SEARCH REGISTER NUMBER..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            ⊕ ADD PARTICIPANTS
          </button>
        </div>

        {loading ? (
          <LoadingState message="LOADING PARTICIPANT REGISTER..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchParticipants} />
        ) : filtered.length === 0 ? (
          <div className="empty-state card">
            <p className="label-telemetry text-muted">
              {participants.length === 0 ? 'NO PARTICIPANTS ADDED YET' : 'NO MATCHES'}
            </p>
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>REGISTER NUMBER</th>
                  <th>TEAM STATUS</th>
                  <th>ADDED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <span className="text-mono text-gold">{p.registerNumber}</span>
                    </td>
                    <td>
                      {p.inTeam ? (
                        <span className="chip chip-approved">
                          <span className="chip-dot" />
                          IN A TEAM
                        </span>
                      ) : (
                        <span className="chip chip-unlocked">
                          <span className="chip-dot" />
                          FREE
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="body-sm text-mono">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(p)}
                        disabled={busy || p.inTeam}
                        title={p.inTeam ? 'Remove them from their team first' : 'Delete this participant'}
                      >
                        🗑 DELETE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add participants modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="ADD PARTICIPANTS">
        <p className="body-sm text-muted mb-md">
          Paste register numbers separated by commas, spaces or new lines.
          Duplicates are skipped automatically.
        </p>
        <textarea
          className="input-field"
          rows={6}
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder={'22BIT0000, 22BIT0001\n22BIT0002'}
          style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
        />
        <div className="flex gap-sm mt-md">
          <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={busy || !bulkInput.trim()}>
            {busy ? 'ADDING...' : '⊕ ADD TO REGISTER'}
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setAddOpen(false)} disabled={busy}>
            CANCEL
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="DELETE PARTICIPANT">
        <p className="body-sm text-muted mb-md">
          Remove <strong className="text-mono">{deleteTarget?.registerNumber}</strong> from
          the official register? They will no longer be able to join any team.
        </p>
        <div className="flex gap-sm">
          <button className="btn btn-danger btn-full" onClick={handleDelete} disabled={busy}>
            🗑 CONFIRM DELETE
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setDeleteTarget(null)} disabled={busy}>
            CANCEL
          </button>
        </div>
      </Modal>

      <style>{`
        .admin-participants { }
        .admin-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .mb-lg { margin-bottom: var(--space-lg); }
        .mt-md { margin-top: var(--space-md); }
        .align-center { align-items: center; }
        .toolbar {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        .search-input { flex: 1; min-width: 220px; }
        .table-scroll { overflow-x: auto; }
        .empty-state { padding: var(--space-2xl); text-align: center; }
      `}</style>
    </AdminLayout>
  );
}
