export default function ErrorMessage({ message, onRetry, title = 'SIGNAL LOST' }) {
  return (
    <div className="error-message card animate-fade-in" role="alert">
      <div className="error-header">
        <span className="error-icon" aria-hidden="true">⚠</span>
        <span className="headline-md text-hazard">{title}</span>
      </div>
      <p className="error-body">{message}</p>
      {onRetry && (
        <button className="btn btn-danger btn-sm mt-md" onClick={onRetry}>
          RETRY
        </button>
      )}

      <style>{`
        .error-message {
          border-color: var(--hazard);
          background: rgba(229,57,53,0.05);
          max-width: 560px;
          margin: var(--space-lg) auto;
        }
        .error-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }
        .error-icon {
          color: var(--hazard);
          font-size: 1.25rem;
        }
        .error-body {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: var(--on-surface-muted);
          letter-spacing: 0.03em;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
