import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchIntersections,
  fetchDailySummary,
  checkServerHealth,
} from "../services/sdsm";

/**
 * useSDSMOverview
 *
 * Custom hook that powers the TrafficOverview component with live SDSM data.
 *
 * Handles:
 *  - Server connectivity check (since the server is started manually)
 *  - Fetching the intersection list for the dropdown
 *  - Fetching daily summary data for the selected intersection
 *  - Polling on an interval so the overview stays up to date
 *  - Loading / error / offline states
 *
 * Usage in TrafficOverview:
 *
 *   const {
 *     serverOnline,
 *     intersections,
 *     selectedIntersection,
 *     setSelectedIntersection,
 *     dailyData,
 *     loading,
 *     error,
 *   } = useSDSMOverview({ pollInterval: 60000 });
 */

const DEFAULT_POLL_INTERVAL = 60_000; // 1 minute

export function useSDSMOverview({
  pollInterval = DEFAULT_POLL_INTERVAL,
} = {}) {
  // --- State ---
  const [serverOnline, setServerOnline] = useState(false);
  const [intersections, setIntersections] = useState([]);
  const [selectedIntersection, setSelectedIntersection] = useState(null);
  const [days, setDays] = useState(90);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);

  // --- 1. Check if the server is running ---
  const checkConnection = useCallback(async () => {
    const online = await checkServerHealth();
    setServerOnline(online);
    return online;
  }, []);

  // --- 2. Load intersection list (once, when server comes online) ---
  const loadIntersections = useCallback(async () => {
    try {
      const list = await fetchIntersections();
      setIntersections(list);

      // Auto-select the first intersection if none is selected
      if (list.length > 0) {
        setSelectedIntersection((prev) => prev ?? list[0].id);
      } else {
        // No intersections → loadDailySummary never runs, so clear loading here
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load intersections:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // --- 3. Fetch daily summary for selected intersection ---
  const loadDailySummary = useCallback(async () => {
    if (!selectedIntersection) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchDailySummary(selectedIntersection, days);
      setDailyData(result.data);
    } catch (err) {
      console.error("Failed to load daily summary:", err);
      setError(err.message);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedIntersection, days]);

  // --- 4. Initial boot sequence ---
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const online = await checkConnection();
      if (cancelled) return;

      if (online) {
        await loadIntersections();
      } else {
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [checkConnection, loadIntersections]);

  // --- 5. Fetch data whenever intersection or days changes ---
  useEffect(() => {
    if (serverOnline && selectedIntersection) {
      loadDailySummary();
    }
  }, [serverOnline, selectedIntersection, days, loadDailySummary]);

  // --- 6. Polling ---
  useEffect(() => {
    if (!serverOnline || !selectedIntersection) return;

    intervalRef.current = setInterval(async () => {
      // Re-check connection in case the server was stopped
      const online = await checkConnection();
      if (online) {
        loadDailySummary();
      }
    }, pollInterval);

    return () => clearInterval(intervalRef.current);
  }, [serverOnline, selectedIntersection, pollInterval, checkConnection, loadDailySummary]);

  // --- Public API ---
  return {
    serverOnline,
    intersections,       // [{ id, label }]  — for the dropdown
    selectedIntersection,
    setSelectedIntersection,
    days,
    setDays,
    dailyData,           // [{ date, vehicles, pedestrians }] — for chart + stats
    loading,
    error,
    refresh: loadDailySummary,
  };
}
