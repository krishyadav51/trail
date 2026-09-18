/**
 * ProgressStatus — displays the current clue progress status as a chip
 */

const STATUS_CONFIG = {
  unlocked: { label: 'UNLOCKED',  className: 'chip-unlocked',  icon: '◉' },
  pending:  { label: 'PENDING',   className: 'chip-pending',   icon: '◌' },
  approved: { label: 'APPROVED',  className: 'chip-approved',  icon: '◈' },
  rejected: { label: 'REJECTED',  className: 'chip-rejected',  icon: '✕' },
  completed:{ label: 'COMPLETED', className: 'chip-completed', icon: '★' },
};

export default function ProgressStatus({ status, large = false }) {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || { label: status.toUpperCase(), className: '', icon: '·' };

  return (
    <span className={`chip ${config.className} ${large ? 'chip-lg' : ''}`}>
      <span>{config.icon}</span>
      {config.label}
      <style>{`
        .chip-lg {
          font-size: 0.75rem;
          padding: 0.375rem 0.875rem;
          gap: 0.5rem;
        }
      `}</style>
    </span>
  );
}
