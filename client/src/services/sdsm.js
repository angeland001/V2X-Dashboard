/**
 * SDSM API Service
 *
 * Frontend service for calling the SDSM backend endpoints.
 * Follows the same pattern as spatZones.js.
 */

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

/**
 * Fetch the list of available intersections for the dropdown.
 * @returns {Promise<Array<{ id: string, label: string }>>}
 */
export async function fetchIntersections() {
  const res = await fetch(`${API_URL}/api/sdsm/overview/intersections`);
  if (!res.ok) {
    throw new Error(`Failed to load intersections (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch daily vehicle/pedestrian summary for a given intersection.
 * Returns data shaped for the overview chart:
 *   { intersection, days, data: [{ date, vehicles, pedestrians }, ...] }
 *
 * @param {string} intersection - Intersection ID (e.g. "MLK_Georgia")
 * @param {number} [days=90]    - How many days of history to fetch
 * @returns {Promise<{ intersection: string, days: number, data: Array }>}
 */
export async function fetchDailySummary(intersection, days = 90) {
  const res = await fetch(
    `${API_URL}/api/sdsm/overview/daily-summary/${intersection}?days=${days}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load daily summary (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch latest live SDSM events for a given intersection.
 * Useful for a "live count" badge or real-time indicator.
 *
 * @param {string} intersection - Intersection ID
 * @returns {Promise<Object>}
 */
export async function fetchLatestEvents(intersection) {
  const res = await fetch(
    `${API_URL}/api/sdsm/latest/${intersection}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load latest events (${res.status})`);
  }
  return res.json();
}

/**
 * Quick connectivity check — hits the health endpoint.
 * Returns true if the server is reachable, false otherwise.
 *
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
