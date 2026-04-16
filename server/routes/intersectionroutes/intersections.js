const express = require("express");
const router = express.Router();
const db = require("../../database/postgis");
const {
  parseCanonicalIntersectionId,
  serializeIntersectionRow,
  fetchIntersectionByCanonicalId,
} = require("../../utils/intersectionIdentity");

// ─── GET all intersections ───────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id AS db_id, name, description,
             ST_AsGeoJSON(ref_point)::json AS ref_point,
             region_id, intersection_id, msg_issue_revision,
             status, created_by, created_at, updated_at
      FROM intersections
      ORDER BY created_at DESC
    `);
    res.json(result.rows.map(serializeIntersectionRow));
  } catch (err) {
    console.error("Error fetching intersections:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single intersection ─────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const intersectionId = parseCanonicalIntersectionId(req.params.id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    const intersection = await fetchIntersectionByCanonicalId(db, intersectionId);
    if (!intersection) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json(serializeIntersectionRow(intersection));
  } catch (err) {
    console.error("Error fetching intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE intersection ─────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, description, ref_point, region_id, intersection_id, created_by } = req.body;
    const normalizedName = normalizeIntersectionName(name);
    const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);

    if (!normalizedName || !ref_point || canonicalIntersectionId == null) {
      return res.status(400).json({ error: "name, ref_point (GeoJSON), and intersection_id are required" });
    }

    const existingByName = await findIntersectionByName(db, normalizedName);
    if (existingByName) {
      return res.status(409).json({ error: `Intersection name '${normalizedName}' already exists` });
    }

    const existingByIntersectionId = await findIntersectionByCanonicalId(db, canonicalIntersectionId);
    if (existingByIntersectionId) {
      return res.status(409).json({ error: `Intersection ID '${canonicalIntersectionId}' already exists` });
    }

    const result = await db.query(
      `INSERT INTO intersections (name, description, ref_point, region_id, intersection_id, created_by)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6)
       RETURNING id AS db_id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      [normalizedName, description || null, JSON.stringify(ref_point), region_id || 0, canonicalIntersectionId, created_by || null]
    );
    res.status(201).json(serializeIntersectionRow(result.rows[0]));
  } catch (err) {
    console.error("Error creating intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE intersection ─────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const canonicalIntersectionId = parseCanonicalIntersectionId(req.params.id);
    const { name, description, ref_point, region_id, intersection_id, status } = req.body;

    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    const existingIntersection = await fetchIntersectionByCanonicalId(db, canonicalIntersectionId);
    if (!existingIntersection) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    if (intersection_id !== undefined) {
      return res.status(400).json({ error: "intersection_id is immutable and cannot be changed after creation" });
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) {
      const normalizedName = normalizeIntersectionName(name);
      if (!normalizedName) {
        return res.status(400).json({ error: "name cannot be empty" });
      }

      const existingByName = await findIntersectionByName(db, normalizedName, existingIntersection.db_id);
      if (existingByName) {
        return res.status(409).json({ error: `Intersection name '${normalizedName}' already exists` });
      }

      sets.push(`name = $${idx++}`);
      vals.push(normalizedName);
    }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (ref_point !== undefined) { sets.push(`ref_point = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(ref_point)); }
    if (region_id !== undefined) { sets.push(`region_id = $${idx++}`); vals.push(region_id); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(canonicalIntersectionId);
    const result = await db.query(
      `UPDATE intersections SET ${sets.join(", ")} WHERE intersection_id = $${idx}
       RETURNING id AS db_id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      vals
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json(serializeIntersectionRow(result.rows[0]));
  } catch (err) {
    console.error("Error updating intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE intersection ─────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const canonicalIntersectionId = parseCanonicalIntersectionId(req.params.id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }
    const result = await db.query(
      "DELETE FROM intersections WHERE intersection_id = $1 RETURNING id AS db_id, intersection_id",
      [canonicalIntersectionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }
    res.json({
      message: "Intersection deleted",
      id: result.rows[0].intersection_id,
    });
  } catch (err) {
    console.error("Error deleting intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── J2735 Helper Functions ──────────────────────────────────────

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

// ─── DECODING: Delta offsets → Coordinates ───────────────────────

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
    // Handle different node formats from MAP messages
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
 * Parse J2735 lat/lon (1e7 scale) to decimal degrees
 */
function fromJ2735LatLon(j2735Point) {
  return {
    lat: j2735Point.lat / 1e7,
    lon: (j2735Point.long || j2735Point.lon) / 1e7,
  };
}

function normalizeLineStringGeometry(geometry) {
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const coordinates = geometry.coordinates
    .filter(
      (coord) =>
        Array.isArray(coord) &&
        coord.length >= 2 &&
        Number.isFinite(Number(coord[0])) &&
        Number.isFinite(Number(coord[1]))
    )
    .map((coord) => [Number(coord[0]), Number(coord[1])]);

  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: "LineString",
    coordinates,
  };
}

/**
 * Import supports either:
 * 1) geometry: GeoJSON LineString coordinates
 * 2) nodeList: J2735 delta nodes
 */
function extractLaneGeometry(lane, refLat, refLon) {
  const geometryFromPayload = normalizeLineStringGeometry(lane.geometry);
  if (geometryFromPayload) {
    return geometryFromPayload;
  }

  const { nodeList } = lane;
  let nodes;
  if (Array.isArray(nodeList) && nodeList[0] === "nodes") {
    nodes = nodeList[1];
  } else if (Array.isArray(nodeList)) {
    nodes = nodeList;
  } else {
    return null;
  }

  const allCoordinates = deltaNodesToCoordinates(refLat, refLon, nodes);
  if (allCoordinates.length < 2) {
    return null;
  }

  // Keep historical behavior for nodeList imports: start/end only.
  return {
    type: "LineString",
    coordinates: [allCoordinates[0], allCoordinates[allCoordinates.length - 1]],
  };
}

function extractLaneType(laneAttributes) {
  let laneType = "vehicle";
  if (laneAttributes?.laneType) {
    const lt = laneAttributes.laneType;
    if (Array.isArray(lt) && lt[0]) {
      laneType = String(lt[0]).toLowerCase();
    } else if (typeof lt === "string") {
      laneType = lt.toLowerCase();
    }
  }
  return laneType;
}

function normalizeLaneTypeForDb(laneType) {
  const map = {
    vehicle: "Vehicle",
    crosswalk: "Crosswalk",
    bike: "Bike",
    sidewalk: "Sidewalk",
    parking: "Parking",
  };
  return map[laneType] || "Vehicle";
}

function lineStringToPolygonGeometry(lineStringGeometry) {
  const line = normalizeLineStringGeometry(lineStringGeometry);
  if (!line || line.coordinates.length < 3) return null;

  const ring = [...line.coordinates];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  if (!isClosed) {
    ring.push(first);
  }

  if (ring.length < 4) return null;

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

function deriveApproachIdFromLaneId(laneID) {
  const parsed = Number(laneID);
  if (!Number.isFinite(parsed)) return null;
  const raw = parsed >= 200 ? parsed - 200 : parsed;
  return raw > 0 ? raw : null;
}

function normalizeIntersectionName(name) {
  return typeof name === "string" ? name.trim() : "";
}

async function findIntersectionByCanonicalId(queryRunner, intersectionId, excludeId = null) {
  if (!Number.isInteger(intersectionId)) return null;

  const params = [intersectionId];
  let sql = `
    SELECT id, intersection_id
    FROM intersections
    WHERE intersection_id = $1
  `;

  if (excludeId != null) {
    sql += ` AND id <> $2`;
    params.push(excludeId);
  }

  sql += ` LIMIT 1`;
  const result = await queryRunner.query(sql, params);
  return result.rows[0] || null;
}

async function findIntersectionByName(queryRunner, name, excludeId = null) {
  const normalized = normalizeIntersectionName(name);
  if (!normalized) return null;

  const params = [normalized];
  let sql = `
    SELECT id, name
    FROM intersections
    WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
  `;

  if (excludeId != null) {
    sql += ` AND id <> $2`;
    params.push(excludeId);
  }

  sql += ` LIMIT 1`;
  const result = await queryRunner.query(sql, params);
  return result.rows[0] || null;
}

function makeBadRequestError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function parseMapDataInput(mapData) {
  if (mapData == null) {
    throw makeBadRequestError("mapData JSON is required");
  }

  if (typeof mapData !== "string") {
    return mapData;
  }

  const trimmed = mapData.trim();
  if (!trimmed) {
    throw makeBadRequestError("mapData JSON is required");
  }

  // Allow users to paste JSON fenced in markdown code blocks.
  const maybeUnfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(maybeUnfenced);
  } catch (_err) {
    const sample = maybeUnfenced.slice(0, 30);
    throw makeBadRequestError(
      `Invalid MAP JSON. Paste raw JSON object text only. Starts with: "${sample}"`
    );
  }
}

// ─── ENCODING: Coordinates → Delta offsets ───────────────────────

function toJ2735LatLon(coords) {
  return {
    lat: Math.round(coords[1] * 1e7),
    long: Math.round(coords[0] * 1e7),
  };
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
    const canonicalIntersectionId = parseCanonicalIntersectionId(req.params.id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    // Fetch intersection
    const intersection = await fetchIntersectionByCanonicalId(db, canonicalIntersectionId);
    if (!intersection) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    // Fetch lanes
    const lanesResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              lane_type, phase, name, lane_number, metadata
       FROM lanes WHERE intersection_id = $1 ORDER BY lane_number, id`,
      [canonicalIntersectionId]
    );

    // Fetch crosswalks
    const cwResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              approach_type, approach_id, name, metadata
       FROM crosswalks WHERE intersection_id = $1 ORDER BY approach_id, id`,
      [canonicalIntersectionId]
    );

    // Fetch lane connections for this intersection
    const connResult = await db.query(
      `SELECT lc.id, lc.from_lane_id, lc.to_lane_id, lc.signal_group,
              tl.lane_number AS to_lane_number
       FROM lane_connections lc
       JOIN lanes fl ON fl.id = lc.from_lane_id
       JOIN lanes tl ON tl.id = lc.to_lane_id
       WHERE fl.intersection_id = $1`,
      [canonicalIntersectionId]
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

    // Build laneSet with geometry (coordinates) format - matching LaneData.ts structure
    const laneSet = lanesResult.rows.map((lane, i) => {
      const connections = connectionsByFromLane[lane.id] || [];

      // Build connectsTo array
      const connectsTo = connections.length > 0
        ? connections.map((c) => ({
            connectingLane: { lane: c.to_lane_number },
            signalGroup: c.signal_group || lane.phase || undefined,
          }))
        : lane.phase != null
          ? [{ connectingLane: { lane: lane.lane_number || i + 1 }, signalGroup: lane.phase }]
          : [];

      const attrs = encodeLaneAttributes(lane);

      // Extract maneuvers from metadata if stored, otherwise default
      const metadata = lane.metadata || {};
      const maneuvers = metadata.maneuvers || [0, 12];

      return {
        laneID: lane.lane_number || i + 1,
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers,
        geometry: lane.geometry, // GeoJSON LineString with coordinates
        connectsTo,
      };
    });

    // Add crosswalks as special lanes
    cwResult.rows.forEach((cw, i) => {
      const cwLane = { lane_type: "crosswalk" };
      const attrs = encodeLaneAttributes(cwLane);

      laneSet.push({
        laneID: 200 + (cw.approach_id || i + 1),
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers: [0, 12],
        geometry: {
          type: "LineString",
          coordinates: cw.geometry.coordinates[0], // outer ring as LineString
        },
        connectsTo: [],
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
      `UPDATE intersections SET status = 'confirmed', msg_issue_revision = $1 WHERE intersection_id = $2`,
      [newRevision, canonicalIntersectionId]
    );

    // Store export
    await db.query(
      `INSERT INTO map_data_exports (intersection_id, map_data_json, revision)
       VALUES ($1, $2, $3)`,
      [canonicalIntersectionId, JSON.stringify(mapDataJson), newRevision]
    );

    res.json({ message: "Intersection confirmed", mapData: mapDataJson });
  } catch (err) {
    console.error("Error confirming intersection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET MapData JSON for intersection (generated live) ──────────
router.get("/:id/mapdata", async (req, res) => {
  try {
    const canonicalIntersectionId = parseCanonicalIntersectionId(req.params.id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    // Fetch intersection
    const intersection = await fetchIntersectionByCanonicalId(db, canonicalIntersectionId);
    if (!intersection) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    // Fetch lanes
    const lanesResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              lane_type, phase, name, lane_number, metadata
       FROM lanes WHERE intersection_id = $1 ORDER BY lane_number, id`,
      [canonicalIntersectionId]
    );

    // Fetch crosswalks
    const cwResult = await db.query(
      `SELECT id, ST_AsGeoJSON(geometry)::json AS geometry,
              approach_type, approach_id, name, metadata
       FROM crosswalks WHERE intersection_id = $1 ORDER BY approach_id, id`,
      [canonicalIntersectionId]
    );

    // Fetch lane connections
    const connResult = await db.query(
      `SELECT lc.id, lc.from_lane_id, lc.to_lane_id, lc.signal_group,
              tl.lane_number AS to_lane_number
       FROM lane_connections lc
       JOIN lanes fl ON fl.id = lc.from_lane_id
       JOIN lanes tl ON tl.id = lc.to_lane_id
       WHERE fl.intersection_id = $1`,
      [canonicalIntersectionId]
    );

    // Build lookup: from_lane_id -> array of connection objects
    const connectionsByFromLane = {};
    connResult.rows.forEach((c) => {
      if (!connectionsByFromLane[c.from_lane_id]) {
        connectionsByFromLane[c.from_lane_id] = [];
      }
      connectionsByFromLane[c.from_lane_id].push(c);
    });

    // Build refPoint
    const refCoords = intersection.ref_point.coordinates;
    const refPoint = toJ2735LatLon(refCoords);

    // Build laneSet with geometry (coordinates) format
    const laneSet = lanesResult.rows.map((lane, i) => {
      const connections = connectionsByFromLane[lane.id] || [];

      const connectsTo = connections.length > 0
        ? connections.map((c) => ({
            connectingLane: { lane: c.to_lane_number },
            signalGroup: c.signal_group || lane.phase || undefined,
          }))
        : lane.phase != null
          ? [{ connectingLane: { lane: lane.lane_number || i + 1 }, signalGroup: lane.phase }]
          : [];

      const attrs = encodeLaneAttributes(lane);
      const metadata = lane.metadata || {};
      const maneuvers = metadata.maneuvers || [0, 12];

      return {
        laneID: lane.lane_number || i + 1,
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers,
        geometry: lane.geometry,
        connectsTo,
      };
    });

    // Add crosswalks
    cwResult.rows.forEach((cw, i) => {
      const cwLane = { lane_type: "crosswalk" };
      const attrs = encodeLaneAttributes(cwLane);

      laneSet.push({
        laneID: 200 + (cw.approach_id || i + 1),
        laneAttributes: {
          directionalUse: attrs.directionalUse,
          sharedWith: attrs.sharedWith,
          laneType: attrs.laneType,
        },
        maneuvers: [0, 12],
        geometry: {
          type: "LineString",
          coordinates: cw.geometry.coordinates[0],
        },
        connectsTo: [],
      });
    });

    const mapDataJson = {
      messageId: 18,
      value: ["MapData", {
        msgIssueRevision: intersection.msg_issue_revision || 1,
        intersections: [
          {
            revision: intersection.msg_issue_revision || 1,
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

    res.json({
      map_data_json: mapDataJson,
      revision: intersection.msg_issue_revision || 1,
      exported_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error generating MapData:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── IMPORT MapData JSON and create intersection + lanes ─────────
router.post("/import", async (req, res) => {
  const client = await db.pool.connect();
  let txStarted = false;

  try {
    const { mapData, name, created_by, intersection_id } = req.body;

    // Parse the MAP message structure
    let mapDataObj = parseMapDataInput(mapData);

    // Handle different MAP message formats
    let intersectionData;
    if (mapDataObj.value && Array.isArray(mapDataObj.value)) {
      // Format: { messageId: 18, value: ["MapData", { intersections: [...] }] }
      const [, mapDataContent] = mapDataObj.value;
      intersectionData = mapDataContent.intersections?.[0];
    } else if (mapDataObj.intersections) {
      // Format: { intersections: [...] }
      intersectionData = mapDataObj.intersections[0];
    } else if (mapDataObj.refPoint && mapDataObj.laneSet) {
      // Direct intersection object
      intersectionData = mapDataObj;
    } else {
      return res.status(400).json({
        error: "Invalid MAP message format. Expected intersections array with refPoint and laneSet."
      });
    }

    if (!intersectionData) {
      return res.status(400).json({ error: "No intersection data found in MAP message" });
    }

    const { refPoint, laneSet, id: mapIntersectionId, revision } = intersectionData;

    if (!refPoint || !laneSet) {
      return res.status(400).json({ error: "MAP message must contain refPoint and laneSet" });
    }

    // Convert J2735 reference point to decimal degrees
    const { lat: refLat, lon: refLon } = fromJ2735LatLon(refPoint);

    // Create GeoJSON point for ref_point
    const refPointGeoJSON = {
      type: "Point",
      coordinates: [refLon, refLat],
    };

    // Create the intersection
    const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);
    if (canonicalIntersectionId == null) {
      return res.status(400).json({ error: "intersection_id is required for MAP import" });
    }

    const intersectionName = normalizeIntersectionName(name) || `Imported Intersection ${canonicalIntersectionId}`;
    const existingByName = await findIntersectionByName(client, intersectionName);
    if (existingByName) {
      return res.status(409).json({ error: `Intersection name '${intersectionName}' already exists` });
    }
    const existingByIntersectionId = await findIntersectionByCanonicalId(client, canonicalIntersectionId);
    if (existingByIntersectionId) {
      return res.status(409).json({ error: `Intersection ID '${canonicalIntersectionId}' already exists` });
    }

    await client.query("BEGIN");
    txStarted = true;

    const intResult = await client.query(
      `INSERT INTO intersections (name, description, ref_point, region_id, intersection_id, msg_issue_revision, status, created_by)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, 'draft', $7)
       RETURNING id AS db_id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      [
        intersectionName,
        `Imported from MAP message`,
        JSON.stringify(refPointGeoJSON),
        mapIntersectionId?.region || 0,
        canonicalIntersectionId,
        revision || 1,
        created_by || null,
      ]
    );
    const createdIntersection = intResult.rows[0];

    // Process each lane from either GeoJSON geometry or nodeList delta format
    const createdLanes = [];
    const createdCrosswalks = [];
    const laneIdMap = {}; // Map laneID from MAP to database lane id

    for (const lane of laneSet) {
      const { laneID, laneAttributes, connectsTo } = lane;
      const geometry = extractLaneGeometry(lane, refLat, refLon);

      if (!geometry) {
        console.warn(`Skipping lane ${laneID}: missing/invalid geometry and nodeList`);
        continue;
      }

      const laneType = extractLaneType(laneAttributes);

      // MAP crosswalk lanes are persisted as crosswalk polygons for editor parity.
      if (laneType === "crosswalk") {
        const polygon = lineStringToPolygonGeometry(geometry);
        if (polygon) {
          const cwResult = await client.query(
            `INSERT INTO crosswalks (intersection_id, geometry, approach_type, approach_id, name, metadata)
             VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6)
             RETURNING id, intersection_id, ST_AsGeoJSON(geometry)::json AS geometry,
                       approach_type, approach_id, name, metadata`,
            [
              createdIntersection.intersection_id,
              JSON.stringify(polygon),
              "Both",
              deriveApproachIdFromLaneId(laneID),
              `Crosswalk ${laneID}`,
              JSON.stringify({ source_lane_id: laneID, connectsTo, originalAttributes: laneAttributes }),
            ]
          );
          createdCrosswalks.push(cwResult.rows[0]);
          continue;
        }
        console.warn(`Crosswalk lane ${laneID} is not polygon-like; storing as lane fallback`);
      }

      const laneTypeDb = normalizeLaneTypeForDb(laneType);

      // Extract phase/signal group from connectsTo if available
      let phase = null;
      if (connectsTo && connectsTo.length > 0 && connectsTo[0].signalGroup) {
        phase = connectsTo[0].signalGroup;
      }

      // Insert lane
      const laneResult = await client.query(
        `INSERT INTO lanes (intersection_id, geometry, lane_type, phase, name, lane_number, metadata)
         VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6, $7)
         RETURNING id, ST_AsGeoJSON(geometry)::json AS geometry,
                   lane_type, phase, name, lane_number, metadata`,
        [
          createdIntersection.intersection_id,
          JSON.stringify(geometry),
          laneTypeDb,
          phase,
          `Lane ${laneID}`,
          laneID,
          JSON.stringify({ connectsTo, originalAttributes: laneAttributes }),
        ]
      );

      const createdLane = laneResult.rows[0];
      createdLanes.push(createdLane);
      laneIdMap[laneID] = createdLane.id;
    }

    // Create lane connections from connectsTo data
    const createdConnections = [];
    for (const lane of laneSet) {
      const { laneID, connectsTo } = lane;
      const fromLaneDbId = laneIdMap[laneID];

      if (!fromLaneDbId || !connectsTo) continue;

      for (const conn of connectsTo) {
        const toLaneNumber = conn.connectingLane?.lane;
        const signalGroup = conn.signalGroup;

        if (!toLaneNumber) continue;

        const toLaneDbId = laneIdMap[toLaneNumber];
        if (!toLaneDbId) {
          console.warn(`Connection target lane ${toLaneNumber} not found`);
          continue;
        }

        try {
          const connResult = await client.query(
            `INSERT INTO lane_connections (from_lane_id, to_lane_id, signal_group)
             VALUES ($1, $2, $3)
             RETURNING id, from_lane_id, to_lane_id, signal_group`,
            [fromLaneDbId, toLaneDbId, signalGroup]
          );
          createdConnections.push(connResult.rows[0]);
        } catch (connErr) {
          console.warn(`Failed to create connection ${laneID} -> ${toLaneNumber}:`, connErr.message);
        }
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "MAP message imported successfully",
      intersection: serializeIntersectionRow(createdIntersection),
      lanes: createdLanes,
      crosswalks: createdCrosswalks,
      connections: createdConnections,
      summary: {
        lanesCreated: createdLanes.length,
        crosswalksCreated: createdCrosswalks.length,
        connectionsCreated: createdConnections.length,
        refPoint: { lat: refLat, lon: refLon },
      },
    });
  } catch (err) {
    if (txStarted) {
      await client.query("ROLLBACK");
    }
    console.error("Error importing MAP message:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── PREVIEW import (decode without saving) ──────────────────────
router.post("/import/preview", async (req, res) => {
  try {
    const { mapData } = req.body;

    let mapDataObj = parseMapDataInput(mapData);

    // Parse MAP message structure (same logic as import)
    let intersectionData;
    if (mapDataObj.value && Array.isArray(mapDataObj.value)) {
      const [, mapDataContent] = mapDataObj.value;
      intersectionData = mapDataContent.intersections?.[0];
    } else if (mapDataObj.intersections) {
      intersectionData = mapDataObj.intersections[0];
    } else if (mapDataObj.refPoint && mapDataObj.laneSet) {
      intersectionData = mapDataObj;
    } else {
      return res.status(400).json({ error: "Invalid MAP message format" });
    }

    if (!intersectionData) {
      return res.status(400).json({ error: "No intersection data found" });
    }

    const { refPoint, laneSet, id: intersectionId, revision } = intersectionData;

    if (!refPoint || !laneSet) {
      return res.status(400).json({ error: "MAP message must contain refPoint and laneSet" });
    }

    const { lat: refLat, lon: refLon } = fromJ2735LatLon(refPoint);

    // Convert all lanes to GeoJSON for preview
    const lanes = [];
    for (const lane of laneSet) {
      const { laneID, laneAttributes, connectsTo } = lane;
      const geometry = extractLaneGeometry(lane, refLat, refLon);
      if (!geometry) continue;

      const coordinates = geometry.coordinates;

      let laneType = "vehicle";
      if (laneAttributes?.laneType) {
        const lt = laneAttributes.laneType;
        if (Array.isArray(lt) && lt[0]) {
          laneType = lt[0].toLowerCase();
        } else if (typeof lt === "string") {
          laneType = lt.toLowerCase();
        }
      }

      lanes.push({
        laneID,
        laneType,
        geometry,
        connectsTo,
        startPoint: coordinates[0],
        endPoint: coordinates[coordinates.length - 1],
      });
    }

    res.json({
      preview: true,
      refPoint: {
        lat: refLat,
        lon: refLon,
        geoJSON: {
          type: "Point",
          coordinates: [refLon, refLat],
        },
      },
      intersectionId,
      revision,
      lanes,
      summary: {
        totalLanes: lanes.length,
        vehicleLanes: lanes.filter((l) => l.laneType === "vehicle").length,
        crosswalks: lanes.filter((l) => l.laneType === "crosswalk").length,
      },
    });
  } catch (err) {
    console.error("Error previewing MAP message:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
