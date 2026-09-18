/**
 * useClue — fetches and polls the current clue for a team
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { clueApi } from '../services/api';

const POLL_INTERVAL_MS = 10000; // poll every 10s when pending

export function useClue(teamCode) {
  const [clueData, setClueData]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const intervalRef               = useRef(null);

  const fetchClue = useCallback(async () => {
    if (!teamCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clueApi.getCurrent(teamCode);
      setClueData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamCode]);

  // Auto-poll when status is 'pending'
  useEffect(() => {
    if (!teamCode) return;
    fetchClue();
  }, [teamCode, fetchClue]);

  useEffect(() => {
    const status = clueData?.progress?.status;
    if (status === 'pending') {
      intervalRef.current = setInterval(fetchClue, POLL_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [clueData?.progress?.status, fetchClue]);

  return { clueData, loading, error, refetch: fetchClue };
}
