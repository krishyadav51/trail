import ProgressStatus from './ProgressStatus';

/**
 * TeamCard — compact display of team metadata
 */
export default function TeamCard({ team }) {
  if (!team) return null;
  const { teamName, teamCode, score, currentStage, status } = team;

  return (
    <div className="team-card card">
      <div className="team-card-header">
        <div>
          <p className="label-coord">OPERATIVE UNIT</p>
          <h2 className="headline-md text-gold mt-xs">{teamName}</h2>
        </div>
        <ProgressStatus status={status} />
      </div>
      <div className="team-card-stats">
        <div className="stat-block">
          <span className="label-coord">CODE</span>
          <span className="stat-value text-mono text-gold">{teamCode}</span>
        </div>
        <div className="stat-block">
          <span className="label-coord">SCORE</span>
          <span className="stat-value text-gold">{score ?? 0}</span>
        </div>
        <div className="stat-block">
          <span className="label-coord">STAGE</span>
          <span className="stat-value">{currentStage ?? 1}</span>
        </div>
      </div>

      <style>{`
        .team-card { }
        .team-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        .mt-xs { margin-top: var(--space-xs); }
        .team-card-stats {
          display: flex;
          gap: var(--space-lg);
          flex-wrap: wrap;
          padding-top: var(--space-md);
          border-top: 1px solid var(--outline-variant);
        }
        .stat-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-value {
          font-family: var(--font-headline);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--on-surface);
        }
      `}</style>
    </div>
  );
}
