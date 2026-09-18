import { useState, useRef } from 'react';
import { clueApi } from '../services/api';

const MAX_PROOFS = 2;

/**
 * ProofUpload — up to 2 image selection + previews + multipart submit
 */
export default function ProofUpload({ teamCode, onSuccess, onError }) {
  const [files, setFiles]           = useState([]);   // [{ file, preview }]
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const inputRef                    = useRef(null);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setSubmitError(null);

    const accepted = [];
    for (const selected of incoming) {
      if (files.length + accepted.length >= MAX_PROOFS) {
        setSubmitError(`You can upload a maximum of ${MAX_PROOFS} images.`);
        break;
      }
      if (!selected.type.startsWith('image/')) {
        setSubmitError('Only image files are accepted.');
        continue;
      }
      accepted.push(selected);
    }

    if (accepted.length === 0) return;

    // Build previews for the newly accepted files
    accepted.forEach((selected) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => {
          if (prev.length >= MAX_PROOFS) return prev;
          if (prev.some((p) => p.file === selected)) return prev;
          return [...prev, { file: selected, preview: reader.result }];
        });
      };
      reader.readAsDataURL(selected);
    });
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    // allow re-picking the same file later
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setSubmitError(null);
    try {
      const formData = new FormData();
      files.forEach(({ file }) => formData.append('proof', file));
      await clueApi.submit(teamCode, formData);
      setFiles([]);
      setProgress(100);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err.message);
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  };

  const canAddMore = files.length < MAX_PROOFS;

  return (
    <div className="proof-upload animate-fade-in">
      <div className="section-header">
        <span className="label-telemetry text-gold">◎ PROOF SUBMISSION</span>
        <span className="label-coord proof-count-hint">
          {files.length}/{MAX_PROOFS} IMAGES {files.length === 0 ? '· AT LEAST 1 REQUIRED' : ''}
        </span>
      </div>

      {/* Drop zone — shown while there is room for more images */}
      {canAddMore && (
        <label className="drop-zone" htmlFor="proof-input">
          <div className="drop-zone-inner">
            <span className="drop-icon" aria-hidden="true">⬆</span>
            <span className="label-telemetry">
              {files.length === 0 ? 'SELECT IMAGE' : `ADD IMAGE (${files.length}/${MAX_PROOFS})`}
            </span>
            <span className="body-sm text-muted">JPEG, PNG, WEBP supported · up to {MAX_PROOFS} images</span>
          </div>
          <input
            id="proof-input"
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {/* Previews — one card per selected image */}
      {files.length > 0 && (
        <div className="proof-preview-grid">
          {files.map(({ file, preview }, index) => (
            <div key={`${file.name}-${index}`} className="proof-preview">
              <div className="preview-header">
                <span className="label-coord">IMAGE {index + 1}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  ✕ REMOVE
                </button>
              </div>
              <img src={preview} alt={`Proof ${index + 1} preview`} className="preview-image" />
              <p className="preview-filename body-sm text-muted">{file.name}</p>
            </div>
          ))}
        </div>
      )}

      {submitError && (
        <div className="alert alert-error mt-sm">{submitError}</div>
      )}

      {/* Progress bar when uploading */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span className="label-coord">TRANSMITTING...</span>
        </div>
      )}

      {/* Actions */}
      <div className="proof-actions">
        {canAddMore && (
          <label htmlFor="proof-input" className="btn btn-recon" style={{ cursor: 'pointer' }}>
            {files.length === 0 ? '⊕ SELECT IMAGE' : '⊕ ADD ANOTHER IMAGE'}
          </label>
        )}
        <button
          className="btn btn-execute btn-lg"
          onClick={handleSubmit}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? 'TRANSMITTING...' : `▶ SUBMIT PROOF${files.length > 1 ? ` (${files.length} IMAGES)` : ''}`}
        </button>
      </div>

      <style>{`
        .proof-upload { display: flex; flex-direction: column; gap: var(--space-md); }
        .proof-count-hint { color: var(--outline); }
        .drop-zone {
          border: 1px dashed var(--outline-variant);
          padding: var(--space-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color var(--transition), background var(--transition);
        }
        .drop-zone:hover {
          border-color: var(--amber);
          background: rgba(245,197,24,0.03);
        }
        .drop-zone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          color: var(--outline);
        }
        .drop-icon { font-size: 2rem; color: var(--amber); }
        .proof-preview-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .proof-preview { display: flex; flex-direction: column; gap: var(--space-sm); }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .preview-image {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          border: 1px solid var(--outline-variant);
          background: var(--surface-dim);
        }
        .preview-filename { text-align: center; }
        .upload-progress {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .progress-bar {
          height: 2px;
          background: var(--primary-bright);
          transition: width 0.3s ease;
        }
        .proof-actions {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}
