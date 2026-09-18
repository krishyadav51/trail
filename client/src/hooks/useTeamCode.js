/**
 * useTeamCode — manages the participant's 30-minute session in localStorage.
 * The team code is stored with an expiry timestamp; once it lapses the session
 * is treated as signed out and the UI bounces the player back to /team.
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'tos_team_code';
const EXPIRY_KEY  = 'tos_team_code_expiry';
const SESSION_MS  = 30 * 60 * 1000; // 30 minutes

const readSession = () => {
  const code    = localStorage.getItem(STORAGE_KEY);
  const expires = Number(localStorage.getItem(EXPIRY_KEY) || 0);

  if (!code) return { teamCode: '', expiresAt: 0 };
  if (!expires || expires <= Date.now()) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return { teamCode: '', expiresAt: 0 };
  }
  return { teamCode: code, expiresAt: expires };
};

export function useTeamCode() {
  const [session, setSessionState] = useState(readSession);

  const setTeamCode = useCallback((code) => {
    if (code) {
      const normalized = code.trim().toUpperCase();
      const expiresAt  = Date.now() + SESSION_MS;
      localStorage.setItem(STORAGE_KEY, normalized);
      localStorage.setItem(EXPIRY_KEY, String(expiresAt));
      setSessionState({ teamCode: normalized, expiresAt });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      setSessionState({ teamCode: '', expiresAt: 0 });
    }
  }, []);

  const clearTeamCode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setSessionState({ teamCode: '', expiresAt: 0 });
  }, []);

  // Auto-expire while the tab is open
  useEffect(() => {
    if (!session.teamCode) return;

    const tick = () => {
      const current = readSession();
      if (!current.teamCode) setSessionState(current);
    };

    const interval = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
    };
  }, [session.teamCode]);

  return { teamCode: session.teamCode, expiresAt: session.expiresAt, setTeamCode, clearTeamCode };
}

export function getTeamSession() {
  return readSession();
}

export function clearTeamSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}
