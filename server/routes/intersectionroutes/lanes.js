const express = require("express");
const router = express.Router();
const db = require("../../database/postgis");
const { parseCanonicalIntersectionId } = require("../../utils/intersectionIdentity");

// ─── Delta to Coordinates Conversion ──────────────────────────────

// Scale factors: metres per unit for each node type
const NODE_SCALE_METRES = {
  "node-XY1": 0.01,
  "node-XY2": 0.10,
  "node-XY3": 1.00,
  "node-XY4": 0.10,
  "node-XY5": 0.05,
  "node-XY6": 0.01,
};

const METRES_PER_DEG_LAT = 111111.0;

/**
 * Convert a raw {x, y} delta offset to metres using the node's scale
 */
function deltaToMetres(delta, nodeType) {
  const scale = NODE_SCALE_METRES[nodeType];
  if (!scale) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }
  return {
    dx: delta.x * scale,
    dy: delta.y * scale,
  };
}

/**
 * Convert a list of delta nodes to absolute lat/lon coordinates
 * @param {number} refLat - Reference point latitude in decimal degrees
 * @param {number} refLon - Reference point longitude in decimal degrees
 * @param {Array} nodes - Array of node objects with delta: [nodeType, {x, y}]
 * @returns {Array} Array of [lon, lat] coordinate pairs (GeoJSON format)
 */
function deltaNodesToCoordinates(refLat, refLon, nodes) {
  let lat = refLat;
  let lon = refLon;
  const coordinates = [];

  for (const node of nodes) {
    let nodeType, delta;

    if (node.delta) {
      // Format: { delta: ["node-XY1", { x: 531, y: 1466 }] }
      [nodeType, delta] = node.delta;
    } else if (Array.isArray(node)) {
      // Format: ["node-XY1", { x: 531, y: 1466 }]
      [nodeType, delta] = node;
    } else {
      throw new Error(`Invalid node format: ${JSON.stringify(node)}`);
    }

    const { dx, dy } = deltaToMetres(delta, nodeType);

    // Convert metres to degrees
    const dLat = dy / METRES_PER_DEG_LAT;
    const dLon = dx / (METRES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

    lat += dLat;
    lon += dLon;

    // GeoJSON uses [lon, lat] order
    coordinates.push([
      parseFloat(lon.toFixed(7)),
      parseFloat(lat.toFixed(7)),
    ]);
  }

  return coordinates;
}

/**
 * Convert nodeList to GeoJSON LineString geometry
 * @param {Array} nodeList - J2735 nodeList: ["nodes", [{delta: [...]}, ...]]
 * @param {number} refLat - Reference point latitude
 * @param {number} refLon - Reference point longitude
 * @returns {Object} GeoJSON LineString geometry
 */
function nodeListToGeometry(nodeList, refLat, refLon) {
  let nodes;
  if (Array.isArray(nodeList) && nodeList[0] === "nodes") {
    nodes = nodeList[1];
  } else if (Array.isArray(nodeList)) {
    nodes = nodeList;
  } else {
    throw new Error("Invalid nodeList format");
  }

  const coordinates = deltaNodesToCoordinates(refLat, refLon, nodes);

  return {
    type: "LineString",
    coordinates,
  };
}

// ─── GET all lanes (optionally filtered by intersection_id) ──────
router.get("/", async (req, res) => {
  try {
    const { intersection_id } = req.query;
    let query = `
      SELECT l.id, l.intersection_id, i.name AS intersection_name,
             ST_AsGeoJSON(l.geometry)::json AS geometry,
             l.lane_type, l.phase, l.name, l.lane_number, l.metadata,
             l.created_at, l.updated_at
      FROM lanes l
      JOIN intersections i ON i.intersection_id = l.intersection_id
    `;
    const params = [];
    if (intersection_id) {
      const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);
      if (canonicalIntersectionId == null) {
        return res.status(400).json({ error: "intersection_id must be a number" });
      }
      query += " WHERE l.intersection_id = $1";
      params.push(canonicalIntersectionId);
    }
    query += " ORDER BY l.intersection_id, l.lane_number, l.id";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching lanes:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single lane ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT l.id, l.intersection_id, i.name AS intersection_name,
              ST_AsGeoJSON(l.geometry)::json AS geometry,
              l.lane_type, l.phase, l.name, l.lane_number, l.metadata,
              l.created_at, l.updated_at
       FROM lanes l
       JOIN intersections i ON i.intersection_id = l.intersection_id
       WHERE l.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lane not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching lane:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE lane ─────────────────────────────────────────────────
// Accepts either:
//   - geometry: GeoJSON LineString (standard format)
//   - nodeList: J2735 delta format ["nodes", [{delta: ["node-XY1", {x, y}]}, ...]]
//     (will be auto-converted to coordinates using intersection's ref_point)
// Also accepts:
//   - maneuvers: [value, bitLength] - allowed turns for the lane
//   - laneAttributes: J2735 lane attributes (directionalUse, sharedWith, laneType)
//   - connectsTo: array of {connectingLane: {lane}, signalGroup}
router.post("/", async (req, res) => {
  try {
    const {
      intersection_id,
      geometry,
      nodeList,
      lane_type,
      phase,
      name,
      lane_number,
      metadata,
      maneuvers,
      laneAttributes,
      connectsTo,
    } = req.body;

    if (!intersection_id) {
      return res.status(400).json({ error: "intersection_id is required" });
    }

    const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    if (!geometry && !nodeList) {
      return res.status(400).json({ error: "Either geometry (GeoJSON) or nodeList (delta format) is required" });
    }

    let finalGeometry = geometry;

    // Enforce exactly 2 coordinates (start and end points) for LineString geometry
    if (finalGeometry && finalGeometry.type === "LineString" && finalGeometry.coordinates?.length > 2) {
      const coords = finalGeometry.coordinates;
      finalGeometry = {
        type: "LineString",
        coordinates: [coords[0], coords[coords.length - 1]],
      };
    }

    // If nodeList provided, convert delta offsets to coordinates
    if (nodeList && !geometry) {
      // Fetch intersection's reference point
      const intResult = await db.query(
        `SELECT ST_X(ref_point) AS lon, ST_Y(ref_point) AS lat FROM intersections WHERE intersection_id = $1`,
        [canonicalIntersectionId]
      );

      if (intResult.rows.length === 0) {
        return res.status(404).json({ error: "Intersection not found" });
      }

      const { lat: refLat, lon: refLon } = intResult.rows[0];

      // Convert nodeList to GeoJSON geometry
      finalGeometry = nodeListToGeometry(nodeList, refLat, refLon);
    }

    // Build metadata object with maneuvers, laneAttributes, connectsTo
    const finalMetadata = {
      ...(metadata || {}),
      ...(maneuvers ? { maneuvers } : {}),
      ...(laneAttributes ? { laneAttributes } : {}),
      ...(connectsTo ? { connectsTo } : {}),
    };

    // Extract signal group from connectsTo if phase not provided
    let finalPhase = phase;
    if (!finalPhase && connectsTo && connectsTo.length > 0 && connectsTo[0].signalGroup) {
      finalPhase = connectsTo[0].signalGroup;
    }

    const result = await db.query(
      `INSERT INTO lanes (intersection_id, geometry, lane_type, phase, name, lane_number, metadata)
       VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6, $7)
       RETURNING id, intersection_id,
                 ST_AsGeoJSON(geometry)::json AS geometry,
                 lane_type, phase, name, lane_number, metadata,
                 created_at, updated_at`,
      [
        canonicalIntersectionId,
        JSON.stringify(finalGeometry),
        lane_type || "Vehicle",
        finalPhase || null,
        name || null,
        lane_number || null,
        JSON.stringify(finalMetadata),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating lane:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE lane ─────────────────────────────────────────────────
// Also supports nodeList for delta-to-coordinate conversion
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { geometry, nodeList, lane_type, phase, name, lane_number, metadata } = req.body;

    // If nodeList provided, convert to geometry
    if (nodeList && !geometry) {
      // First get the lane's intersection_id
      const laneResult = await db.query(
        `SELECT intersection_id FROM lanes WHERE id = $1`,
        [id]
      );
      if (laneResult.rows.length === 0) {
        return res.status(404).json({ error: "Lane not found" });
      }

      const { intersection_id } = laneResult.rows[0];

      // Fetch intersection's reference point
      const intResult = await db.query(
        `SELECT ST_X(ref_point) AS lon, ST_Y(ref_point) AS lat FROM intersections WHERE intersection_id = $1`,
        [intersection_id]
      );

      if (intResult.rows.length === 0) {
        return res.status(404).json({ error: "Intersection not found" });
      }

      const { lat: refLat, lon: refLon } = intResult.rows[0];
      geometry = nodeListToGeometry(nodeList, refLat, refLon);
    }

    // Enforce exactly 2 coordinates (start and end points) for LineString geometry
    if (geometry && geometry.type === "LineString" && geometry.coordinates?.length > 2) {
      const coords = geometry.coordinates;
      geometry = {
        type: "LineString",
        coordinates: [coords[0], coords[coords.length - 1]],
      };
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    if (geometry !== undefined) {
      sets.push(`geometry = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`);
      vals.push(JSON.stringify(geometry));
    }
    if (lane_type !== undefined) { sets.push(`lane_type = $${idx++}`); vals.push(lane_type); }
    if (phase !== undefined) { sets.push(`phase = $${idx++}`); vals.push(phase); }
    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (lane_number !== undefined) { sets.push(`lane_number = $${idx++}`); vals.push(lane_number); }
    if (metadata !== undefined) { sets.push(`metadata = $${idx++}`); vals.push(JSON.stringify(metadata)); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(id);
    const result = await db.query(
      `UPDATE lanes SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, intersection_id,
                 ST_AsGeoJSON(geometry)::json AS geometry,
                 lane_type, phase, name, lane_number, metadata,
                 created_at, updated_at`,
      vals
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lane not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating lane:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── BULK CREATE lanes from laneSet ──────────────────────────────
// Creates multiple lanes at once, auto-converting delta nodes to coordinates
// Accepts laneSet in LaneData.ts format with geometry or nodeList
router.post("/bulk", async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { intersection_id, laneSet } = req.body;

    if (!intersection_id || !laneSet || !Array.isArray(laneSet)) {
      return res.status(400).json({ error: "intersection_id and laneSet array are required" });
    }

    const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    // Fetch intersection's reference point
    const intResult = await client.query(
      `SELECT ST_X(ref_point) AS lon, ST_Y(ref_point) AS lat FROM intersections WHERE intersection_id = $1`,
      [canonicalIntersectionId]
    );

    if (intResult.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    const { lat: refLat, lon: refLon } = intResult.rows[0];

    await client.query("BEGIN");

    const createdLanes = [];

    for (const lane of laneSet) {
      const { laneID, laneAttributes, nodeList, connectsTo, maneuvers } = lane;

      // Get geometry from nodeList or direct geometry
      let geometry;
      if (lane.geometry) {
        geometry = lane.geometry;
      } else if (nodeList) {
        geometry = nodeListToGeometry(nodeList, refLat, refLon);
      } else {
        console.warn(`Skipping lane ${laneID}: no geometry or nodeList`);
        continue;
      }

      // Enforce exactly 2 coordinates (start and end points) for LineString geometry
      if (geometry && geometry.type === "LineString" && geometry.coordinates?.length > 2) {
        const coords = geometry.coordinates;
        geometry = {
          type: "LineString",
          coordinates: [coords[0], coords[coords.length - 1]],
        };
      }

      // Determine lane type
      let laneType = "vehicle";
      if (laneAttributes?.laneType) {
        const lt = laneAttributes.laneType;
        if (Array.isArray(lt) && lt[0]) {
          laneType = lt[0].toLowerCase();
        } else if (typeof lt === "string") {
          laneType = lt.toLowerCase();
        }
      }

      // Extract phase/signal group from connectsTo
      let phase = null;
      if (connectsTo && connectsTo.length > 0 && connectsTo[0].signalGroup) {
        phase = connectsTo[0].signalGroup;
      }

      // Build metadata with maneuvers, laneAttributes, connectsTo
      const metadata = {
        maneuvers: maneuvers || [0, 12],
        laneAttributes,
        connectsTo: connectsTo || [],
      };

      const result = await client.query(
        `INSERT INTO lanes (intersection_id, geometry, lane_type, phase, name, lane_number, metadata)
         VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6, $7)
         RETURNING id, intersection_id,
                   ST_AsGeoJSON(geometry)::json AS geometry,
                   lane_type, phase, name, lane_number, metadata,
                   created_at, updated_at`,
        [
          canonicalIntersectionId,
          JSON.stringify(geometry),
          laneType,
          phase,
          `Lane ${laneID}`,
          laneID,
          JSON.stringify(metadata),
        ]
      );

      createdLanes.push(result.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: `Created ${createdLanes.length} lanes`,
      lanes: createdLanes,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error bulk creating lanes:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── DELETE lane ─────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM lanes WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lane not found" });
    }
    res.json({ message: "Lane deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting lane:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
