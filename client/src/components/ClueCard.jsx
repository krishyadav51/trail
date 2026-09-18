import AssetViewer from './AssetViewer';
import ProgressStatus from './ProgressStatus';

/**
 * ClueCard — displays the current clue with metadata and assets
 */
export default function ClueCard({ clue, progress }) {
  if (!clue) return null;

  const { title, description, stage, assets = [], hintText } = clue;
  const status = progress?.status;

  return (
    <div className="clue-card card card-elevated animate-fade-in">
      {/* Header */}
      <div className="clue-card-header">
        <div className="clue-meta">
          <span className="label-coord">STAGE {stage}</span>
          <span className="reticle-line" />
          <ProgressStatus status={status} />
        </div>
        <h2 className="headline-lg text-gold mt-md">{title}</h2>
      </div>

      {/* Description */}
      {description && (
        <div className="clue-description">
          <div className="clue-description-inner">
            <p className="body-lg">{description}</p>
          </div>
        </div>
      )}

      {/* Stage-7 hint (served by the API for every set) */}
      {hintText && (
        <div className="clue-hint">
          <span className="label-coord text-gold">🔐 HINT</span>
          <p className="body-lg">"{hintText}"</p>
        </div>
      )}

      {/* Assets */}
      {assets.length > 0 && (
        <div className="clue-assets">
          <p className="label-coord mb-sm">◈ CLASSIFIED ASSET</p>
          {assets.map((asset, idx) => (
            <AssetViewer key={idx} asset={{ ...asset, label: asset.name }} />
          ))}
        </div>
      )}

      {/* Rejection reason */}
      {status === 'rejected' && progress?.rejectionReason && (
        <div className="alert alert-error">
          <strong>REJECTION REASON:</strong> {progress.rejectionReason}
        </div>
      )}

      <style>{`
        .clue-card { }
        .clue-card-header { margin-bottom: var(--space-lg); }
        .clue-meta {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .clue-description {
          margin-bottom: var(--space-lg);
          padding: var(--space-md);
          border-left: 2px solid var(--amber);
          background: rgba(229,169,60,0.04);
        }
        .clue-hint {
          margin-top: var(--space-lg);
          padding: var(--space-md);
          border-left: 2px solid var(--amber);
          background: rgba(229,169,60,0.04);
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .clue-assets {
          margin-top: var(--space-lg);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--outline-variant);
        }
        .mb-sm { margin-bottom: var(--space-sm); }

        /* Asset styles */
        :global(.asset-container) {
          margin-bottom: var(--space-md);
        }
        :global(.asset-label) {
          margin-bottom: var(--space-sm);
        }
        :global(.asset-image) {
          width: 100%;
          max-height: 480px;
          object-fit: contain;
          border: 1px solid var(--outline-variant);
        }
        :global(.asset-video),
        :global(.asset-audio) {
          width: 100%;
        }
        :global(.asset-multiple) {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
      `}</style>
    </div>
  );
}
