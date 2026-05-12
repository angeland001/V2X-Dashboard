const express = require("express");
const router  = express.Router();
const db      = require("../../../database/postgis");

// GET /api/vss/cameras
// Returns distinct camera IDs that have stored events.
router.get("/cameras", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DISTINCT camera_id FROM vss_events ORDER BY camera_id`
        );
        res.json(result.rows.map((r) => ({ id: r.camera_id, label: r.camera_id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vss/events/latest/:camera?limit=50
// Returns the most recent events for a camera.
router.get("/events/latest/:camera", async (req, res) => {
    const { camera } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    try {
        const result = await db.query(
            `SELECT id, camera_id, stream_name, event_type, timestamp,
                    longitude, latitude, description, confidence, metadata
             FROM vss_events
             WHERE camera_id = $1
             ORDER BY timestamp DESC
             LIMIT $2`,
            [camera, limit]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vss/events/summary/:camera?scope=today|lifetime
// Returns event counts grouped by event_type for stat cards.
router.get("/events/summary/:camera", async (req, res) => {
    const { camera } = req.params;
    const scope = req.query.scope || "today";

    const dateFilter = scope === "today"
        ? `AND timestamp::date = CURRENT_DATE`
        : "";

    try {
        const result = await db.query(
            `SELECT event_type, COUNT(*)::int AS count
             FROM vss_events
             WHERE camera_id = $1 ${dateFilter}
             GROUP BY event_type
             ORDER BY count DESC`,
            [camera]
        );
        res.json({ camera, scope, breakdown: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vss/events/daily/:camera?days=30
// Returns daily event counts for the chart.
router.get("/events/daily/:camera", async (req, res) => {
    const { camera } = req.params;
    const days = parseInt(req.query.days, 10) || 30;
    try {
        const result = await db.query(
            `SELECT timestamp::date AS date, event_type, COUNT(*)::int AS count
             FROM vss_events
             WHERE camera_id = $1
               AND timestamp >= NOW() - ($2 || ' days')::interval
             GROUP BY date, event_type
             ORDER BY date ASC`,
            [camera, days]
        );
        res.json({ camera, days, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vss/events/geojson/:camera?limit=200
// Returns events with coordinates as a GeoJSON FeatureCollection for the map overlay.
router.get("/events/geojson/:camera", async (req, res) => {
    const { camera } = req.params;
    const limit = parseInt(req.query.limit, 10) || 200;
    try {
        const result = await db.query(
            `SELECT id, camera_id, event_type, timestamp,
                    longitude, latitude, description, confidence
             FROM vss_events
             WHERE camera_id = $1
               AND longitude IS NOT NULL
               AND latitude  IS NOT NULL
             ORDER BY timestamp DESC
             LIMIT $2`,
            [camera, limit]
        );

        const geojson = {
            type: "FeatureCollection",
            features: result.rows.map((row) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [row.longitude, row.latitude] },
                properties: {
                    id:          row.id,
                    camera_id:   row.camera_id,
                    event_type:  row.event_type,
                    timestamp:   row.timestamp,
                    description: row.description,
                    confidence:  row.confidence,
                },
            })),
        };

        res.json(geojson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
