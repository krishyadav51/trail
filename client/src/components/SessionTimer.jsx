import { useEffect, useState } from 'react';

/**
 * SessionTimer — shows the remaining participant session time (MM:SS).
 * Calls onExpire() the moment the countdown reaches zero.
 */
export default function SessionTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : 0
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) onExpire?.();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt || remaining === 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes      = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds      = String(totalSeconds % 60).padStart(2, '0');
  const urgent       = totalSeconds <= 120; // last 2 minutes

  return (
    <div
      className={`session-timer ${urgent ? 'session-timer--urgent' : ''}`}
      title="Your session ends after 30 minutes. Re-enter your team code to continue."
    >
      <span className="label-coord">⏱ SESSION</span>
      <span className="body-sm text-mono">{minutes}:{seconds}</span>
    </div>
  );
}
