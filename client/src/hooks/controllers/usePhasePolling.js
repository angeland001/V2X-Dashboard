import { useState, useEffect, useRef } from "react";
import { fetchAllPhaseStatuses, fetchLiveTimingParameters } from "../../services/controllers";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls live status for all 8 phases and timing parameters for the selected
 * signal group every 3 seconds.  Polling stops when adapterId is null.
 *
 * @param {string|number|null} adapterId
 * @param {number} selectedGroup  (1–8)
 */
export function usePhasePolling(adapterId, selectedGroup) {
  const [allPhaseData, setAllPhaseData] = useState({});
  const [timingData,   setTimingData]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!adapterId) {
      setAllPhaseData({});
      setTimingData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const [phases, timing] = await Promise.all([
          fetchAllPhaseStatuses(adapterId),
          selectedGroup ? fetchLiveTimingParameters(adapterId, selectedGroup) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          const map = {};
          for (const p of phases) map[p.signalGroup] = p;
          setAllPhaseData(map);
          if (timing != null) setTimingData(timing);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

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
  }, [adapterId, selectedGroup]);

  // phaseData for the currently selected group (convenience alias)
  const phaseData = allPhaseData[selectedGroup] ?? null;

  return { phaseData, allPhaseData, timingData, loading, error };
}
