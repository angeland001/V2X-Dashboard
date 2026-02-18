/**
 * SDSM (Sensor Data Sharing Message) API Routes
 *
 * Endpoints for fetching, storing, and retrieving SDSM events
 * from Chattanooga CV2X infrastructure
 */

const express = require("express");
const router = express.Router();
const db = require("../../../database/postgis");
// Using built-in fetch (Node.js 18+) or require node-fetch for older versions
const fetch = globalThis.fetch || require("node-fetch");

// Base URL for SDSM events API
const SDSM_BASE_URL =
  "http://roadaware.cuip.research.utc.edu/cv2x/latest/sdsm_events";

// Available intersections
const INTERSECTIONS = ["MLK_Georgia", "MLK_Lindsay"];

/**
 * GET /api/sdsm/latest/:intersection
 * Fetch latest SDSM events from external API for a specific intersection
 */
router.get("/latest/:intersection", async (req, res) => {
  try {
    const { intersection } = req.params;

    if (!INTERSECTIONS.includes(intersection)) {
      return res.status(400).json({
        error: "Invalid intersection",
        available: INTERSECTIONS,
      });
    }

    const url = `${SDSM_BASE_URL}/${intersection}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching SDSM data:", error);
    res.status(500).json({
      error: "Failed to fetch SDSM data",
      message: error.message,
    });
  }
});

/**
 * GET /api/sdsm/latest/all
 * Fetch latest SDSM events from all intersections
 */
router.get("/latest/all", async (req, res) => {
  try {
    const promises = INTERSECTIONS.map(async (intersection) => {
      const url = `${SDSM_BASE_URL}/${intersection}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch ${intersection}: ${response.status}`);
        return null;
      }
      return await response.json();
    });

    const results = await Promise.all(promises);
    const validResults = results.filter((r) => r !== null);

    res.json({
      intersections: validResults,
      count: validResults.length,
    });
  } catch (error) {
    console.error("Error fetching all SDSM data:", error);
    res.status(500).json({
      error: "Failed to fetch SDSM data",
      message: error.message,
    });
  }
});

/**
 * POST /api/sdsm/store
 * Store SDSM events in database for long-term analytics
 */
router.post("/store", async (req, res) => {
  try {
    const { intersectionID, intersection, timestamp, objects } = req.body;

    if (!objects || !Array.isArray(objects)) {
      return res.status(400).json({ error: "Invalid objects array" });
    }

    // Insert all objects into database
    const insertPromises = objects.map((obj) => {
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
        ) VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (intersection_name, object_id, timestamp) DO NOTHING
        RETURNING id;
      `,
        [
          intersectionID,
          intersection,
          obj.objectID,
          obj.type,
          timestamp,
          longitude,
          latitude,
          obj.heading,
          obj.speed,
          obj.size?.width || null,
          obj.size?.length || null,
          JSON.stringify(obj),
        ],
      );
    });

    const results = await Promise.all(insertPromises);
    const insertedCount = results.filter((r) => r.rows.length > 0).length;

    res.json({
      success: true,
      inserted: insertedCount,
      total: objects.length,
    });
  } catch (error) {
    console.error("Error storing SDSM data:", error);
    res.status(500).json({
      error: "Failed to store SDSM data",
      message: error.message,
    });
  }
});

/**
 * GET /api/sdsm/history/:intersection
 * Get historical SDSM data for a specific intersection
 * Query params: hours (default 24), object_type (optional)
 */
router.get("/history/:intersection", async (req, res) => {
  try {
    const { intersection } = req.params;
    const { hours = 24, object_type } = req.query;

    let query = `
      SELECT
        id,
        intersection_id,
        intersection_name,
        object_id,
        object_type,
        timestamp,
        longitude,
        latitude,
        heading,
        speed,
        size_width,
        size_length,
        ST_AsGeoJSON(location)::json as location_geojson
      FROM sdsm_events
      WHERE intersection_name = $1
        AND timestamp >= NOW() - INTERVAL '${parseInt(hours)} hours'
    `;

    const params = [intersection];

    if (object_type) {
      query += ` AND object_type = $2`;
      params.push(object_type);
    }

    query += ` ORDER BY timestamp DESC LIMIT 10000;`;

    const result = await db.query(query, params);

    res.json({
      intersection,
      hours: parseInt(hours),
      count: result.rows.length,
      events: result.rows,
    });
  } catch (error) {
    console.error("Error fetching SDSM history:", error);
    res.status(500).json({
      error: "Failed to fetch SDSM history",
      message: error.message,
    });
  }
});

/**
 * GET /api/sdsm/analytics/:intersection
 * Get aggregated analytics for an intersection
 */
router.get("/analytics/:intersection", async (req, res) => {
  try {
    const { intersection } = req.params;
    const { days = 7 } = req.query;

    const result = await db.query(
      `
      SELECT
        object_type,
        DATE_TRUNC('hour', timestamp) AS hour,
        COUNT(*) AS event_count,
        COUNT(DISTINCT object_id) AS unique_objects,
        AVG(speed) FILTER (WHERE speed < 8191) AS avg_speed
      FROM sdsm_events
      WHERE intersection_name = $1
        AND timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY object_type, DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC;
    `,
      [intersection],
    );

    res.json({
      intersection,
      days: parseInt(days),
      analytics: result.rows,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: error.message,
    });
  }
});

/**
 * GET /api/sdsm/geojson/:intersection
 * Get SDSM events as GeoJSON for Kepler.gl visualization
 */
router.get("/geojson/:intersection", async (req, res) => {
  try {
    const { intersection } = req.params;
    const { hours = 1, object_type } = req.query;

    let query = `
      SELECT
        id,
        intersection_id,
        intersection_name,
        object_id,
        object_type,
        timestamp,
        longitude,
        latitude,
        heading,
        speed,
        size_width,
        size_length,
        ST_AsGeoJSON(location)::json as geometry
      FROM sdsm_events
      WHERE intersection_name = $1
        AND timestamp >= NOW() - INTERVAL '${parseInt(hours)} hours'
    `;

    const params = [intersection];

    if (object_type) {
      query += ` AND object_type = $2`;
      params.push(object_type);
    }

    query += ` ORDER BY timestamp DESC LIMIT 5000;`;

    const result = await db.query(query, params);

    // Format as GeoJSON FeatureCollection
    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        id: row.id,
        geometry: row.geometry,
        properties: {
          id: row.id,
          intersection_id: row.intersection_id,
          intersection_name: row.intersection_name,
          object_id: row.object_id,
          object_type: row.object_type,
          timestamp: row.timestamp,
          heading: row.heading,
          speed: row.speed,
          size_width: row.size_width,
          size_length: row.size_length,
        },
      })),
    };

    res.json(geojson);
  } catch (error) {
    console.error("Error fetching GeoJSON:", error);
    res.status(500).json({
      error: "Failed to fetch GeoJSON",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/sdsm/cleanup
 * Clean up old SDSM events (retention policy)
 * Query param: days (default 180)
 */
router.delete("/cleanup", async (req, res) => {
  try {
    const { days = 180 } = req.query;

    const result = await db.query(
      "SELECT cleanup_old_sdsm_events($1) as deleted_count;",
      [parseInt(days)],
    );

    res.json({
      success: true,
      deleted: result.rows[0].deleted_count,
      retention_days: parseInt(days),
    });
  } catch (error) {
    console.error("Error cleaning up SDSM data:", error);
    res.status(500).json({
      error: "Failed to clean up SDSM data",
      message: error.message,
    });
  }
});

module.exports = router;
