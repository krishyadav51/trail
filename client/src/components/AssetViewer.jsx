import { useState } from 'react';
import { assetUrl } from '../services/api';

/**
 * AssetViewer — renders clue assets based on assetType
 * Handles: image, video, audio, document, web, multiple
 * Every asset gets a direct download link under it (true file
 * download with the original filename via ?download=1).
 */

function DownloadLink({ fileId, url, label = 'DOWNLOAD FILE' }) {
  // ?download=1 streams the file as an attachment through the backend
  const href = fileId ? `${assetUrl(fileId)}?download=1` : url;
  if (!href) return null;
  return (
    <div className="asset-download-row">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-recon btn-sm"
      >
        ⬇ {label}
      </a>
      <span className="label-coord asset-download-hint">SAVES THE ORIGINAL FILE</span>
    </div>
  );
}

export default function AssetViewer({ asset }) {
  const [failed, setFailed]         = useState(false);
  const [retryKey, setRetryKey]     = useState(0);
  const [autoRetries, setAutoRetries] = useState(0);

  if (!asset) return null;

  const { assetType, fileId, url, assets: multipleAssets, label } = asset;

  // Multiple assets — recurse
  if (assetType === 'multiple' && Array.isArray(multipleAssets)) {
    return (
      <div className="asset-multiple">
        {multipleAssets.map((a, idx) => (
          <AssetViewer key={idx} asset={a} />
        ))}
      </div>
    );
  }

  const src = fileId ? assetUrl(fileId) : url;

  if (!src) return null;

  // Auto-retry transient failures (backend restart, Google hiccup) a few
  // times with backoff before giving up and showing the error card.
  const handleImageError = () => {
    if (autoRetries < 3) {
      const delay = 800 * (autoRetries + 1);
      setTimeout(() => {
        setAutoRetries((n) => n + 1);
        setRetryKey((k) => k + 1); // cache-busting re-mount
      }, delay);
      return;
    }
    setFailed(true);
  };

  // A manual retry (or a new clue) resets the whole cycle
  const handleManualRetry = () => {
    setFailed(false);
    setAutoRetries(0);
    setRetryKey((k) => k + 1);
  };

  const withLabel = (node) => (
    <div className="asset-container">
      {label && <p className="asset-label label-coord">{label}</p>}
      {node}
    </div>
  );

  if (assetType === 'image') {
    if (failed) {
      return withLabel(
        <>
          <div className="alert alert-error">
            Image could not be loaded inline.{' '}
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open asset directly
            </a>
          </div>
          <div className="asset-download-row mt-sm">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleManualRetry}
            >
              ↺ RETRY
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn btn-recon btn-sm"
            >
              ⬇ DOWNLOAD IMAGE
            </a>
          </div>
        </>
      );
    }

    return withLabel(
      <>
        <img
          key={retryKey}
          src={retryKey > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${retryKey}` : src}
          alt={label || 'Clue asset'}
          className="asset-image"
          onError={handleImageError}
        />
        <DownloadLink fileId={fileId} url={url} label="DOWNLOAD IMAGE" />
      </>
    );
  }

  if (assetType === 'video') {
    return withLabel(
      <>
        <video controls className="asset-video">
          <source src={src} />
          Your browser does not support video playback.
        </video>
        <DownloadLink fileId={fileId} url={url} label="DOWNLOAD VIDEO" />
      </>
    );
  }

  if (assetType === 'audio') {
    return withLabel(
      <>
        <audio controls className="asset-audio">
          <source src={src} />
          Your browser does not support audio playback.
        </audio>
        <DownloadLink fileId={fileId} url={url} label="DOWNLOAD AUDIO" />
      </>
    );
  }

  if (assetType === 'document') {
    return withLabel(
      <>
        <DownloadLink fileId={fileId} url={url} label="OPEN / DOWNLOAD DOCUMENT" />
      </>
    );
  }

  if (assetType === 'web') {
    return withLabel(
      <>
        <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-recon">
          ↗ OPEN LINK
        </a>
      </>
    );
  }

  // Fallback
  return withLabel(
    <DownloadLink fileId={fileId} url={url} label="VIEW / DOWNLOAD ASSET" />
  );
}
