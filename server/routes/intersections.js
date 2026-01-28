const express = require("express");
const router = express.Router();
const db = require("../database/postgis");

// ─── GET all intersections ───────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, description,
             ST_AsGeoJSON(ref_point)::json AS ref_point,
             region_id, intersection_id, msg_issue_revision,
             status, created_by, created_at, updated_at
      FROM intersections
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching intersections:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single intersection ─────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, description,
              ST_AsGeoJSON(ref_point)::json AS ref_point,
              region_id, intersection_id, msg_issue_revision,
              status, created_by, created_at, updated_at
       FROM intersections WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE intersection ─────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, description, ref_point, region_id, intersection_id, created_by } = req.body;

    if (!name || !ref_point || intersection_id == null) {
      return res.status(400).json({ error: "name, ref_point (GeoJSON), and intersection_id are required" });
    }

    const result = await db.query(
      `INSERT INTO intersections (name, description, ref_point, region_id, intersection_id, created_by)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6)
       RETURNING id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      [name, description || null, JSON.stringify(ref_point), region_id || 0, intersection_id, created_by || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE intersection ─────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, ref_point, region_id, intersection_id, status } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (ref_point !== undefined) { sets.push(`ref_point = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(ref_point)); }
    if (region_id !== undefined) { sets.push(`region_id = $${idx++}`); vals.push(region_id); }
    if (intersection_id !== undefined) { sets.push(`intersection_id = $${idx++}`); vals.push(intersection_id); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(id);
    const result = await db.query(
      `UPDATE intersections SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      vals
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE intersection ─────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM intersections WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json({ message: "Intersection deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CONFIRM intersection & export MapData ───────────────────────
router.post("/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch intersection
    const intResult = await db.query(
      `SELECT id, name, description,
              ST_AsGeoJSON(ref_point)::json AS ref_point,
              region_id, intersection_id, msg_issue_revision, status
       FROM intersections WHERE id = $1`,
      [id]
    );
    if (intResult.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    const intersection = intResult.rows[0];

    // Fetch lanes
    const lanesResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              lane_type, phase, name, lane_number, metadata
       FROM lanes WHERE intersection_id = $1 ORDER BY lane_number, id`,
      [id]
    );

    // Fetch crosswalks
    const cwResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              approach_type, approach_id, name, metadata
       FROM crosswalks WHERE intersection_id = $1 ORDER BY approach_id, id`,
      [id]
    );

    // Build SAE J2735 MapData-like JSON
    const refCoords = intersection.ref_point.coordinates;
    const laneSet = lanesResult.rows.map((lane, i) => {
      const coords = lane.geometry.coordinates;
      return {
        laneID: lane.lane_number || i + 1,
        name: lane.name || `Lane ${lane.lane_number || i + 1}`,
        laneAttributes: {
          directionalUse: { ingressPath: true, egressPath: true },
          sharedWith: {},
          laneType: { [lane.lane_type.toLowerCase()]: true },
        },
        nodeList: {
          nodes: coords.map((c) => ({
            delta: { nodeLLatLon: { lon: c[0], lat: c[1] } },
          })),
        },
        ...(lane.phase != null
          ? {
              connectsTo: [
                {
                  connectingLane: { lane: lane.lane_number || i + 1 },
                  signalGroup: lane.phase,
                },
              ],
            }
          : {}),
        maneuvers: { maneuverStraightAllowed: true },
      };
    });

    // Add crosswalks as special lanes
    cwResult.rows.forEach((cw, i) => {
      const coords = cw.geometry.coordinates[0]; // outer ring
      laneSet.push({
        laneID: 200 + (cw.approach_id || i + 1),
        name: cw.name || `Crosswalk ${cw.approach_id || i + 1}`,
        laneAttributes: {
          directionalUse: {
            ingressPath: cw.approach_type === "Ingress" || cw.approach_type === "Both",
            egressPath: cw.approach_type === "Egress" || cw.approach_type === "Both",
          },
          sharedWith: {},
          laneType: { crosswalk: true },
        },
        nodeList: {
          nodes: coords.map((c) => ({
            delta: { nodeLLatLon: { lon: c[0], lat: c[1] } },
          })),
        },
      });
    });

    const newRevision = (intersection.msg_issue_revision || 0) + 1;

    const mapDataJson = {
      msgIssueRevision: newRevision,
      layerType: "intersectionData",
      layerID: intersection.region_id,
      intersections: [
        {
          id: {
            region: intersection.region_id,
            id: intersection.intersection_id,
          },
          name: intersection.name,
          refPoint: {
            lat: refCoords[1],
            long: refCoords[0],
          },
          laneWidth: 366,
          laneSet,
        },
      ],
    };

    // Bump revision + set confirmed
    await db.query(
      `UPDATE intersections SET status = 'confirmed', msg_issue_revision = $1 WHERE id = $2`,
      [newRevision, id]
    );

    // Store export
    await db.query(
      `INSERT INTO map_data_exports (intersection_id, map_data_json, revision)
       VALUES ($1, $2, $3)`,
      [id, JSON.stringify(mapDataJson), newRevision]
    );

    res.json({ message: "Intersection confirmed", mapData: mapDataJson });
  } catch (err) {
    console.error("Error confirming intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET MapData JSON for intersection ───────────────────────────
router.get("/:id/mapdata", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT map_data_json, revision, exported_at
       FROM map_data_exports WHERE intersection_id = $1
       ORDER BY revision DESC LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No MapData export found. Confirm the intersection first." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching MapData:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
