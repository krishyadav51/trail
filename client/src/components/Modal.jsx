import { useEffect, useRef } from 'react';

/**
 * Modal — sharp-cornered dialog overlay
 * Props: isOpen, onClose, title, children, maxWidth
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = '480px' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth }}>
        {/* Header */}
        <div className="modal-header">
          <span className="label-telemetry text-gold">{title}</span>
          <button
            className="modal-close btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <hr />
        <div className="modal-content">
          {children}
        </div>
      </div>

      <style>{`
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }
        .modal-content { padding-top: var(--space-md); }
      `}</style>
    </div>
  );
}
