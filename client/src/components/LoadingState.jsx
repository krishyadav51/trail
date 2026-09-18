export default function LoadingState({ message = 'SCANNING COORDINATES...', fullScreen = false }) {
  return (
    <div className={`loading-state ${fullScreen ? 'loading-full' : ''}`}>
      <div className="loading-inner">
        <div className="loading-reticle" aria-hidden="true">
          <div className="reticle-ring outer" />
          <div className="reticle-ring inner" />
          <div className="reticle-cross h" />
          <div className="reticle-cross v" />
        </div>
        <p className="loading-text label-telemetry">{message}</p>
      </div>

      <style>{`
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-2xl) var(--space-lg);
        }
        .loading-full {
          position: fixed;
          inset: 0;
          background: rgba(13,13,13,0.85);
          z-index: 200;
        }
        .loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
        }
        .loading-reticle {
          position: relative;
          width: 64px;
          height: 64px;
        }
        .reticle-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid;
          border-color: var(--outline-variant);
        }
        .reticle-ring.outer {
          animation: spin 2s linear infinite;
          border-top-color: var(--primary-bright);
        }
        .reticle-ring.inner {
          inset: 12px;
          animation: spin 1.2s linear infinite reverse;
          border-top-color: var(--amber);
        }
        .reticle-cross {
          position: absolute;
          background: var(--outline-variant);
        }
        .reticle-cross.h { top: 50%; left: 0; right: 0; height: 1px; transform: translateY(-50%); }
        .reticle-cross.v { left: 50%; top: 0; bottom: 0; width: 1px; transform: translateX(-50%); }
        .loading-text {
          color: var(--outline);
          animation: blink-cursor 1.2s ease infinite;
        }
      `}</style>
    </div>
  );
}
