/**
 * SDSM Overview Routes
 *
 * Aggregated endpoints that power the dashboard overview page.
 * These query the sdsm_events table for daily summaries.
 *
 * GET /intersections                  - List available intersections
 * GET /daily-summary/:intersection    - Daily vehicle/VRU counts
 */

const express = require("express");
const router = express.Router();
const db = require("../../../database/postgis");

// Fallback display-name mapping in case the DB has no data yet.
// Keys = values stored in sdsm_events.intersection_name
const INTERSECTION_LABELS = {
  MLK_Georgia: "MLK & Georgia Ave",
  MLK_Lindsay: "MLK & Lindsay St",
};

/**
 * GET /api/sdsm/overview/intersections
 * Returns the list of intersections the frontend can pick from.
 * Queries the DB for any intersection that has recorded events,
 * falling back to the hardcoded map for known intersections
 * that haven't received data yet.
 */
router.get("/intersections", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT DISTINCT intersection_name FROM sdsm_events ORDER BY intersection_name"
    );

    // Build a set of IDs found in the DB
    const dbNames = new Set(result.rows.map((r) => r.intersection_name));

    // Merge: DB results + any hardcoded ones not yet in DB
    const merged = new Map();
    for (const row of result.rows) {
      merged.set(
        row.intersection_name,
        INTERSECTION_LABELS[row.intersection_name] || row.intersection_name
      );
    }
    for (const [id, label] of Object.entries(INTERSECTION_LABELS)) {
      if (!dbNames.has(id)) {
        merged.set(id, label);
      }
    }

    const intersections = Array.from(merged, ([id, label]) => ({ id, label }));

    res.json(intersections);
  } catch (error) {
    console.error("Error fetching intersections:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sdsm/overview/daily-summary/:intersection?days=90
 *
 * Returns daily aggregated counts shaped for the overview chart:
 *   [{ date, vehicles, pedestrians }, ...]
 *
 * Schema object_type values: 'vehicle' | 'vru'
 *   vehicles    = COUNT where object_type = 'vehicle'
 *   pedestrians = COUNT where object_type = 'vru' (Vulnerable Road User)
 */
router.get("/daily-summary/:intersection", async (req, res) => {
  try {
    const { intersection } = req.params;
    const days = parseInt(req.query.days) || 90;

    const result = await db.query(
      `
      SELECT
        DATE(timestamp) AS date,
        COUNT(*) FILTER (WHERE object_type = 'vehicle') AS vehicles,
        COUNT(*) FILTER (WHERE object_type = 'vru')     AS pedestrians
      FROM sdsm_events
      WHERE intersection_name = $1
        AND timestamp >= NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(timestamp)
      ORDER BY date ASC;
      `,
      [intersection, days]
    );

    res.json({
      intersection,
      days,
      data: result.rows.map((r) => ({
        date: r.date,
        vehicles: parseInt(r.vehicles),
        pedestrians: parseInt(r.pedestrians),
      })),
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
