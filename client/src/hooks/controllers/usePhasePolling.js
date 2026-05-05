import { useState, useEffect, useRef } from "react";
import { fetchLivePhaseStatus, fetchLiveTimingParameters } from "../../services/controllers";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls live phase status and timing parameters for a specific controller and
 * signal group every 3 seconds.  Polling stops when adapterId is null.
 *
 * @param {string|number|null} adapterId
 * @param {number} signalGroup  (1–8)
 */
export function usePhasePolling(adapterId, signalGroup) {
  const [phaseData,  setPhaseData]  = useState(null);
  const [timingData, setTimingData] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const intervalRef = useRef(null);

  useEffect(() => {
    // Clear any running poll first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!adapterId || !signalGroup) {
      setPhaseData(null);
      setTimingData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const [phase, timing] = await Promise.all([
          fetchLivePhaseStatus(adapterId, signalGroup),
          fetchLiveTimingParameters(adapterId, signalGroup),
        ]);
        if (!cancelled) {
          setPhaseData(phase);
          setTimingData(timing);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Immediate first fetch
    setLoading(true);
    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [adapterId, signalGroup]);

  return { phaseData, timingData, loading, error };
}
