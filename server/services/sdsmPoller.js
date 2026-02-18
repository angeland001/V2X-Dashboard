/**
 * SDSM Poller Service
 *
 * Automatically fetches live SDSM events from the external CV2X API
 * and stores them in the database. Starts when the server boots.
 *
 * The external API returns a snapshot of currently-detected objects at
 * each intersection. This poller grabs that snapshot on an interval
 * and persists it so the dashboard overview has historical data to show.
 */

const db = require("../database/postgis");
const fetch = globalThis.fetch || require("node-fetch");
const { SDSM_BASE_URL, INTERSECTIONS } = require("../config/sdsm");

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let intervalId = null;

/**
 * Fetch latest events for one intersection and insert into DB.
 * Uses ON CONFLICT DO NOTHING so duplicate snapshots are harmless.
 */
async function ingestIntersection(intersection) {
  const url = `${SDSM_BASE_URL}/${intersection}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.warn(
      `[SDSM Poller] ${intersection}: API returned ${response.status}`
    );
    return 0;
  }

  const data = await response.json();

  if (!data.objects || !Array.isArray(data.objects) || data.objects.length === 0) {
    return 0;
  }

  const insertPromises = data.objects.map((obj) => {
    const [longitude, latitude] = obj.location.coordinates;

    return db.query(
      `
      INSERT INTO sdsm_events (
        intersection_id,
        intersection_name,
        object_id,
        object_type,
        timestamp,
        location,
        longitude,
        latitude,
        heading,
        speed,
        size_width,
        size_length,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        ST_SetSRID(ST_MakePoint($6, $7), 4326),
        $6, $7, $8, $9, $10, $11, $12
      )
      ON CONFLICT (intersection_name, object_id, timestamp) DO NOTHING
      RETURNING id;
      `,
      [
        data.intersectionID,
        data.intersection,
        obj.objectID,
        obj.type,
        data.timestamp,
        longitude,
        latitude,
        obj.heading,
        obj.speed,
        obj.size?.width || null,
        obj.size?.length || null,
        JSON.stringify(obj),
      ]
    );
  });

  const results = await Promise.all(insertPromises);
  return results.filter((r) => r.rows.length > 0).length;
}

/**
 * Run one poll cycle across all intersections.
 */
async function pollOnce() {
  for (const intersection of INTERSECTIONS) {
    try {
      const inserted = await ingestIntersection(intersection);
      if (inserted > 0) {
        console.log(
          `[SDSM Poller] ${intersection}: ingested ${inserted} new events`
        );
      }
    } catch (err) {
      console.error(`[SDSM Poller] ${intersection}: ${err.message}`);
    }
  }
}

/**
 * Start the poller. Call this once from server startup.
 */
function start() {
  if (intervalId) return; // already running

  console.log(
    `[SDSM Poller] Starting — polling every ${POLL_INTERVAL_MS / 1000}s for ${INTERSECTIONS.join(", ")}`
  );

  // Run immediately on startup, then on interval
  pollOnce();
  intervalId = setInterval(pollOnce, POLL_INTERVAL_MS);
}

/**
 * Stop the poller (for graceful shutdown).
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[SDSM Poller] Stopped");
  }
}

module.exports = { start, stop };
