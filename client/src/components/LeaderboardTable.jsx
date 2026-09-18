/**
 * LeaderboardTable — displays ranked teams with top-3 highlighting
 */
export default function LeaderboardTable({ teams }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="empty-lb">
        <span className="label-telemetry text-muted">NO OPERATIVES ON BOARD YET</span>
      </div>
    );
  }

  const RANK_STYLE = {
    1: { class: 'rank-gold',   icon: '▲' },
    2: { class: 'rank-silver', icon: '▲' },
    3: { class: 'rank-bronze', icon: '▲' },
  };

  return (
    <div className="lb-table-wrapper">
      <table className="data-table lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>TEAM</th>
            <th>CODE</th>
            <th>SCORE</th>
            <th>BONUS</th>
            <th>STAGE</th>
            <th>STATUS</th>
            <th>FINISHED</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => {
            const rank = idx + 1;
            const rs   = RANK_STYLE[rank];
            const finishedTime = team.completedAt
              ? new Date(team.completedAt).toLocaleTimeString('en-IN', { hour12: false })
              : '—';

            return (
              <tr key={team.teamCode} className={rs ? `lb-row ${rs.class}` : 'lb-row'}>
                <td>
                  <span className={`rank-badge ${rs ? rs.class : ''}`}>
                    {rs ? rs.icon : '#'}
                    {rank}
                  </span>
                </td>
                <td>
                  <span className="team-name">{team.teamName}</span>
                </td>
                <td>
                  <span className="text-mono body-sm text-muted">{team.teamCode}</span>
                </td>
                <td>
                  <span className="score-val">{team.score ?? 0}</span>
                </td>
                <td>
                  <span className={`body-sm text-mono ${team.bonusPoints > 0 ? 'bonus-hot' : 'text-muted'}`}>
                    {team.bonusPoints > 0 ? `+${team.bonusPoints}` : '—'}
                  </span>
                </td>
                <td>{team.currentStage ?? 1}</td>
                <td>
                  <span className={`chip chip-${team.status || 'unlocked'}`}>
                    <span className="chip-dot" />
                    {(team.status || 'active').toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="text-mono body-sm">{finishedTime}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style>{`
        .lb-table-wrapper { overflow-x: auto; }
        .lb-table { min-width: 640px; }
        .lb-row { transition: background var(--transition); }
        .bonus-hot { color: #4ade80; font-weight: 700; }
        .lb-row.rank-gold   { background: rgba(245,197,24,0.06); }
        .lb-row.rank-silver { background: rgba(192,192,192,0.04); }
        .lb-row.rank-bronze { background: rgba(205,127,50,0.04); }
        .rank-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-family: var(--font-headline);
          font-weight: 800;
          font-size: 0.9375rem;
        }
        .rank-badge.rank-gold   { color: var(--primary-bright); }
        .rank-badge.rank-silver { color: #c0c0c0; }
        .rank-badge.rank-bronze { color: #cd7f32; }
        .team-name {
          font-family: var(--font-headline);
          font-weight: 700;
          font-size: 0.9375rem;
        }
        .score-val {
          font-family: var(--font-headline);
          font-weight: 700;
          color: var(--primary-bright);
        }
        .empty-lb {
          padding: var(--space-2xl);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
