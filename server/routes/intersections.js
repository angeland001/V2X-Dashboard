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

// ─── J2735 Helper Functions ──────────────────────────────────────

function toJ2735LatLon(coords) {
  return {
    lat: Math.round(coords[1] * 1e7),
    long: Math.round(coords[0] * 1e7),
  };
}

function coordToXYOffsetCm(coord, refCoord) {
  const refLatRad = (refCoord[1] * Math.PI) / 180;
  const x = Math.round((coord[0] - refCoord[0]) * Math.cos(refLatRad) * 111320 * 100);
  const y = Math.round((coord[1] - refCoord[1]) * 110540 * 100);
  return { x, y };
}

function getNodeXYRange(x, y) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const maxVal = Math.max(ax, ay);
  if (maxVal <= 511 && x >= -512 && y >= -512) return "node-XY1";
  if (maxVal <= 1023 && x >= -1024 && y >= -1024) return "node-XY2";
  if (maxVal <= 2047 && x >= -2048 && y >= -2048) return "node-XY3";
  if (maxVal <= 4095 && x >= -4096 && y >= -4096) return "node-XY4";
  if (maxVal <= 8191 && x >= -8192 && y >= -8192) return "node-XY5";
  return "node-XY6";
}

function encodeLaneAttributes(lane) {
  const laneType = (lane.lane_type || "vehicle").toLowerCase();

  // directionalUse: 2-bit field [value, bitLength]
  // bit 0 = ingress, bit 1 = egress => both = 3 => [3, 2]; ingress-only = [1, 2]; egress-only = [2, 2]
  let directionalUse = [2, 2]; // default ingress+egress (big-endian: bit1=ingressPath, bit0=egressPath)
  if (laneType === "crosswalk") {
    directionalUse = [2, 2];
  }

  return {
    directionalUse,
    sharedWith: [0, 10],
    laneType: [laneType === "crosswalk" ? "crosswalk" : "vehicle", [0, 8]],
  };
}

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

    // Fetch lane connections for this intersection
    const connResult = await db.query(
      `SELECT lc.id, lc.from_lane_id, lc.to_lane_id, lc.signal_group,
              tl.lane_number AS to_lane_number
       FROM lane_connections lc
       JOIN lanes fl ON fl.id = lc.from_lane_id
       JOIN lanes tl ON tl.id = lc.to_lane_id
       WHERE fl.intersection_id = $1`,
      [id]
    );

    // Build lookup: from_lane_id -> array of connection objects
    const connectionsByFromLane = {};
    connResult.rows.forEach((c) => {
      if (!connectionsByFromLane[c.from_lane_id]) {
        connectionsByFromLane[c.from_lane_id] = [];
      }
      connectionsByFromLane[c.from_lane_id].push(c);
    });

    // Build SAE J2735 MapData JSON (ASN.1 encoding format)
    const refCoords = intersection.ref_point.coordinates;
    const refPoint = toJ2735LatLon(refCoords);

    const laneSet = lanesResult.rows.map((lane, i) => {
      const coords = lane.geometry.coordinates;
      const connections = connectionsByFromLane[lane.id] || [];

      const connectsTo = connections.length > 0
        ? connections.map((c) => ({
            connectingLane: { lane: c.to_lane_number },
            signalGroup: c.signal_group || lane.phase || undefined,
          }))
        : lane.phase != null
          ? [{ connectingLane: { lane: lane.lane_number || i + 1 }, signalGroup: lane.phase }]
          : undefined;

      const attrs = encodeLaneAttributes(lane);

      const nodes = coords.map((c) => {
        const offset = coordToXYOffsetCm(c, refCoords);
        const tag = getNodeXYRange(offset.x, offset.y);
        return { delta: [tag, { x: offset.x, y: offset.y }] };
      });

      return {
        laneID: lane.lane_number || i + 1,
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers: [0, 12],
        nodeList: ["nodes", nodes],
        ...(connectsTo ? { connectsTo } : {}),
      };
    });

    // Add crosswalks as special lanes
    cwResult.rows.forEach((cw, i) => {
      const coords = cw.geometry.coordinates[0]; // outer ring
      const cwLane = { lane_type: "crosswalk" };
      const attrs = encodeLaneAttributes(cwLane);

      const nodes = coords.map((c) => {
        const offset = coordToXYOffsetCm(c, refCoords);
        const tag = getNodeXYRange(offset.x, offset.y);
        return { delta: [tag, { x: offset.x, y: offset.y }] };
      });

      laneSet.push({
        laneID: 200 + (cw.approach_id || i + 1),
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers: [0, 12],
        nodeList: ["nodes", nodes],
      });
    });

    const newRevision = (intersection.msg_issue_revision || 0) + 1;

    const mapDataJson = {
      messageId: 18,
      value: ["MapData", {
        msgIssueRevision: newRevision,
        intersections: [
          {
            revision: newRevision,
            id: {
              region: intersection.region_id,
              id: intersection.intersection_id,
            },
            refPoint,
            laneSet,
          },
        ],
      }],
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
