import { useState, useEffect, useRef } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const POLL_MS = 1500;

/**
 * Polls the stream-bridge ring buffer for the latest SPaT event that matches
 * the given CUIP intersection slug. Updates every 1.5 seconds.
 *
 * @param {string|null} cuipSlug  e.g. "MLK_Georgia"
 * @returns {{ spatData: object|null, receivedAt: string|null, error: string|null }}
 */
export function useSpatData(cuipSlug) {
  const [spatData,   setSpatData]   = useState(null);
  const [receivedAt, setReceivedAt] = useState(null);
  const [error,      setError]      = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!cuipSlug) {
      setSpatData(null);
      setReceivedAt(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/stream-ingest/spat-events/latest?intersection=${encodeURIComponent(cuipSlug)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { event } = await res.json();
        if (!cancelled) {
          setSpatData(event?.data ?? null);
          setReceivedAt(event?.receivedAt ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [cuipSlug]);

  return { spatData, receivedAt, error };
}
