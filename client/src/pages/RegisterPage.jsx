import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { teamApi, participantApi } from '../services/api';
import { useTeamCode } from '../hooks/useTeamCode';

export default function RegisterPage() {
  const navigate    = useNavigate();
  const { setTeamCode } = useTeamCode();

  const [form, setForm] = useState({
    teamName: '',
    leaderName: '',
    leaderEmail: '',
    leaderRegNo: '',
  });
  const [memberRegNos, setMemberRegNos] = useState(['']);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [registeredCode, setRegisteredCode] = useState(null);
  const [officialNumbers, setOfficialNumbers] = useState(null); // null = not fetched
  const [driveFolderCreated, setDriveFolderCreated] = useState(false);

  // Pre-fetch the official register so we can warn early (best-effort)
  useEffect(() => {
    let cancelled = false;
    participantApi
      .list()
      .then((res) => {
        if (!cancelled) setOfficialNumbers((res.data.participants || []).map((p) => p.registerNumber));
      })
      .catch(() => {
        if (!cancelled) setOfficialNumbers(null);
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMemberChange = (idx, value) => {
    setMemberRegNos((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const addMember = () => setMemberRegNos((prev) => [...prev, '']);
  const removeMember = (idx) =>
    setMemberRegNos((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const members = memberRegNos
          .map((r) => r.trim())
          .filter(Boolean)
          .map((registerNumber) => ({ registerNumber }));

      const payload = {
        teamName:    form.teamName.trim(),
        leader: {
          name: form.leaderName.trim(),
          email: form.leaderEmail.trim(),
          registerNumber: form.leaderRegNo.trim(),
        },
        members,
      };

      // Pre-check: every member must be on the official participant register.
      // Registering a team whose members aren't listed will always fail.
      if (Array.isArray(officialNumbers)) {
        const allNumbers = [payload.leader.registerNumber.toUpperCase(),
          ...members.map((m) => m.registerNumber.toUpperCase())];
        const missing = allNumbers.filter((n) => !officialNumbers.includes(n));
        if (missing.length > 0) {
          setError(
            `These register numbers are not on the official participant list: ${missing.join(', ')}. ` +
            'Contact the organisers to be added.'
          );
          setLoading(false);
          return;
        }
      }
      const res = await teamApi.register(payload);
      const newTeamCode = res.data.teamCode || res.data?.team?.teamCode;

      // Remember whether the server managed to create the Google Drive
      // proof folder (info only — registration never depends on Drive).
      setDriveFolderCreated(!!res.data.driveFolderCreated);

      // Start a proper 30-minute session (hook stores expiry too)
      setTeamCode(newTeamCode);
      setRegisteredCode(newTeamCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (registeredCode) {
    return (
      <MainLayout>
        <div className="reg-page page-container">
          <div className="success-box card card-elevated animate-fade-in">
            <div className="success-icon">◈</div>
            <h1 className="headline-lg text-gold">REGISTRATION SUCCESSFUL</h1>
            <p className="body-sm text-muted mt-md">
              Your operative unit has been registered. Use your team code to access the mission.
            </p>

            <div className="code-display">
              <span className="label-coord">YOUR TEAM ACCESS CODE</span>
              <div className="code-value">{registeredCode}</div>
              <p className="body-sm text-muted">Save this code — you will need it to play.</p>
            </div>

            {driveFolderCreated && (
              <p className="body-sm text-muted drive-note">
                ☁ A proof folder for your team was created on the organisers'
                Google Drive — every photo you submit will be archived there.
              </p>
            )}

            <div className="flex gap-md mt-lg flex-wrap">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/game')}
              >
                ▶ START PLAYING
              </button>
              <button
                className="btn btn-recon"
                onClick={() => navigator.clipboard?.writeText(registeredCode)}
              >
                ◉ COPY CODE
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .success-box { max-width: 520px; margin: 0 auto; text-align: center; }
          .success-icon { font-size: 3rem; color: var(--primary-bright); margin-bottom: var(--space-md); }
          .drive-note { margin-top: var(--space-md); opacity: 0.85; }
          .mt-md { margin-top: var(--space-md); }
          .mt-lg { margin-top: var(--space-lg); }
          .flex-wrap { flex-wrap: wrap; }
          .code-display {
            margin: var(--space-xl) 0;
            padding: var(--space-lg);
            border: 1px solid var(--primary-bright);
            background: rgba(245,197,24,0.06);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-sm);
          }
          .code-value {
            font-family: var(--font-headline);
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: 0.3em;
            color: var(--primary-bright);
          }
        `}</style>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="reg-page page-container">
        <div className="reg-header section-header">
          <div>
            <span className="label-coord">OPERATIVE ENLISTMENT</span>
            <h1 className="headline-lg mt-xs">REGISTER YOUR TEAM</h1>
          </div>
        </div>

        <div className="reg-grid">
          {/* Form */}
          <form onSubmit={handleSubmit} className="reg-form card animate-fade-in" noValidate>
            {/* Team name */}
            <div className="input-group">
              <label className="input-label" htmlFor="teamName">TEAM NAME</label>
              <input
                id="teamName"
                name="teamName"
                type="text"
                className="input-field"
                placeholder="ALPHA UNIT"
                value={form.teamName}
                onChange={handleChange}
                required
                maxLength={50}
              />
            </div>

            <hr />
            <p className="label-telemetry text-gold mb-md">TEAM LEADER</p>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label" htmlFor="leaderName">FULL NAME</label>
                <input
                  id="leaderName"
                  name="leaderName"
                  type="text"
                  className="input-field"
                  placeholder="Agent Name"
                  value={form.leaderName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="leaderEmail">EMAIL</label>
                <input
                  id="leaderEmail"
                  name="leaderEmail"
                  type="email"
                  className="input-field"
                  placeholder="agent@vit.ac.in"
                  value={form.leaderEmail}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="leaderRegNo">REGISTER NUMBER</label>
              <input
                id="leaderRegNo"
                name="leaderRegNo"
                type="text"
                className="input-field"
                placeholder="22BIT0000"
                value={form.leaderRegNo}
                onChange={handleChange}
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <hr />
            <div className="members-header">
              <p className="label-telemetry text-gold">TEAM MEMBERS</p>
              <button type="button" className="btn btn-recon btn-sm" onClick={addMember}>
                ⊕ ADD MEMBER
              </button>
            </div>

            {memberRegNos.map((regNo, idx) => (
              <div key={idx} className="member-row">
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="input-label" htmlFor={`member-${idx}`}>
                    MEMBER {idx + 1} REG. NO.
                  </label>
                  <input
                    id={`member-${idx}`}
                    type="text"
                    className="input-field"
                    placeholder="22BIT0001"
                    value={regNo}
                    onChange={(e) => handleMemberChange(idx, e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                {memberRegNos.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '1.5rem' }}
                    onClick={() => removeMember(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {error && <div className="alert alert-error mt-md">{error}</div>}

            <button
              type="submit"
              className="btn btn-execute btn-full btn-lg mt-lg"
              disabled={loading}
            >
              {loading ? 'REGISTERING...' : '◈ REGISTER TEAM'}
            </button>
          </form>

          {/* Info panel */}
          <aside className="reg-info animate-slide-in">
            <div className="card">
              <p className="label-telemetry text-gold mb-md">◉ INSTRUCTIONS</p>
              <ul className="info-list">
                {[
                  'Register your team with accurate details.',
                  'The team leader\'s email will receive important updates.',
                  'You will receive a unique team code after registration.',
                  'Keep the code safe — it is your access key.',
                  'All register numbers must be valid VIT format.',
                ].map((tip, i) => (
                  <li key={i} className="info-item">
                    <span className="info-bullet text-gold">◈</span>
                    <span className="body-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .reg-page { }
        .mt-xs { margin-top: var(--space-xs); }
        .mb-md { margin-bottom: var(--space-md); }
        .mt-md { margin-top: var(--space-md); }
        .mt-lg { margin-top: var(--space-lg); }
        .reg-header { margin-bottom: var(--space-xl); }
        .reg-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: var(--space-lg);
          align-items: start;
        }
        @media (max-width: 900px) { .reg-grid { grid-template-columns: 1fr; } }
        .members-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }
        .member-row {
          display: flex;
          align-items: flex-end;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .info-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .info-item {
          display: flex;
          gap: var(--space-sm);
          align-items: flex-start;
        }
        .info-bullet { flex-shrink: 0; margin-top: 2px; }
      `}</style>
    </MainLayout>
  );
}
