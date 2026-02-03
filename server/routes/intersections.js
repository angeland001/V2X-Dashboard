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

// ─── ENCODING: Coordinates → Delta offsets ───────────────────────

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

// ─── GET MapData JSON for intersection (generated live) ──────────
router.get("/:id/mapdata", async (req, res) => {
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

    // Fetch lane connections
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

  try {
    const { mapData, name, created_by } = req.body;

    if (!mapData) {
      return res.status(400).json({ error: "mapData JSON is required" });
    }

    // Parse the MAP message structure
    let mapDataObj = typeof mapData === "string" ? JSON.parse(mapData) : mapData;

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

    const { refPoint, laneSet, id: intersectionId, revision } = intersectionData;

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

    await client.query("BEGIN");

    // Create the intersection
    const intersectionName = name || `Imported Intersection ${intersectionId?.id || Date.now()}`;
    const intResult = await client.query(
      `INSERT INTO intersections (name, description, ref_point, region_id, intersection_id, msg_issue_revision, status, created_by)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, 'draft', $7)
       RETURNING id, name, description,
                 ST_AsGeoJSON(ref_point)::json AS ref_point,
                 region_id, intersection_id, msg_issue_revision,
                 status, created_by, created_at, updated_at`,
      [
        intersectionName,
        `Imported from MAP message`,
        JSON.stringify(refPointGeoJSON),
        intersectionId?.region || 0,
        intersectionId?.id || 0,
        revision || 1,
        created_by || null,
      ]
    );
    const createdIntersection = intResult.rows[0];

    // Process each lane and convert delta nodes to coordinates
    const createdLanes = [];
    const laneIdMap = {}; // Map laneID from MAP to database lane id

    for (const lane of laneSet) {
      const { laneID, laneAttributes, nodeList, connectsTo } = lane;

      // Extract nodes from nodeList
      // Format: ["nodes", [{ delta: ["node-XY1", {x, y}] }, ...]]
      let nodes;
      if (Array.isArray(nodeList) && nodeList[0] === "nodes") {
        nodes = nodeList[1];
      } else if (Array.isArray(nodeList)) {
        nodes = nodeList;
      } else {
        console.warn(`Skipping lane ${laneID}: invalid nodeList format`);
        continue;
      }

      // Convert delta nodes to absolute coordinates
      const coordinates = deltaNodesToCoordinates(refLat, refLon, nodes);

      if (coordinates.length < 2) {
        console.warn(`Skipping lane ${laneID}: insufficient coordinates`);
        continue;
      }

      // Create GeoJSON LineString
      const geometry = {
        type: "LineString",
        coordinates,
      };

      // Determine lane type from attributes
      let laneType = "vehicle";
      if (laneAttributes?.laneType) {
        const lt = laneAttributes.laneType;
        if (Array.isArray(lt) && lt[0]) {
          laneType = lt[0].toLowerCase();
        } else if (typeof lt === "string") {
          laneType = lt.toLowerCase();
        }
      }

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
          createdIntersection.id,
          JSON.stringify(geometry),
          laneType,
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
      intersection: createdIntersection,
      lanes: createdLanes,
      connections: createdConnections,
      summary: {
        lanesCreated: createdLanes.length,
        connectionsCreated: createdConnections.length,
        refPoint: { lat: refLat, lon: refLon },
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error importing MAP message:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── PREVIEW import (decode without saving) ──────────────────────
router.post("/import/preview", async (req, res) => {
  try {
    const { mapData } = req.body;

    if (!mapData) {
      return res.status(400).json({ error: "mapData JSON is required" });
    }

    let mapDataObj = typeof mapData === "string" ? JSON.parse(mapData) : mapData;

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
      const { laneID, laneAttributes, nodeList, connectsTo } = lane;

      let nodes;
      if (Array.isArray(nodeList) && nodeList[0] === "nodes") {
        nodes = nodeList[1];
      } else if (Array.isArray(nodeList)) {
        nodes = nodeList;
      } else {
        continue;
      }

      const coordinates = deltaNodesToCoordinates(refLat, refLon, nodes);

      if (coordinates.length < 2) continue;

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
        geometry: {
          type: "LineString",
          coordinates,
        },
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
