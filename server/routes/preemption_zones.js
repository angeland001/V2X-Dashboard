const express = require("express");
const router = express.Router();
const db = require("../database/postgis");
const { parseCanonicalIntersectionId } = require("../utils/intersectionIdentity");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeLaneIds(value) {
  if (!Array.isArray(value)) return null;
  const nums = value
    .map((x) => parseFiniteNumber(x))
    .filter((x) => x != null)
    .map((x) => Math.trunc(x));
  const uniq = Array.from(new Set(nums));
  uniq.sort((a, b) => a - b);
  return uniq;
}

function normalizeControllerIp(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function validateGeoJsonTypes({ polygon, entry_line, exit_line }) {
  if (!polygon || polygon.type !== "Polygon") return "polygon must be a GeoJSON Polygon";
  if (!entry_line || entry_line.type !== "LineString") return "entry_line must be a GeoJSON LineString";
  if (!exit_line || exit_line.type !== "LineString") return "exit_line must be a GeoJSON LineString";
  return null;
}

async function ensureIntersectionExists(intersectionId) {
  const result = await db.query(
    "SELECT id FROM intersections WHERE intersection_id = $1 LIMIT 1",
    [intersectionId],
  );
  return result.rows.length > 0;
}

async function ensureLaneIdsBelongToIntersection(intersectionId, laneIds) {
  if (!laneIds || laneIds.length === 0) {
    return { ok: false, missing: laneIds || [] };
  }

  const found = await db.query(
    "SELECT id FROM lanes WHERE intersection_id = $1 AND id = ANY($2::int[])",
    [intersectionId, laneIds],
  );
  const foundIds = new Set(found.rows.map((r) => r.id));
  const missing = laneIds.filter((id) => !foundIds.has(id));
  return { ok: missing.length === 0, missing };
}

async function resolveIntersectionIdFromQuery(intersectionIdRaw) {
  if (intersectionIdRaw != null && String(intersectionIdRaw).trim() !== "") {
    const intersectionId = parseCanonicalIntersectionId(intersectionIdRaw);
    if (intersectionId == null) {
      return { error: "intersection_id must be a number" };
    }
    return { intersectionId };
  }

  return { intersectionId: null };
}

function baseSelectSql() {
  return `
    SELECT
      p.id,
      p.intersection_id,
      i.name AS intersection_name,
      p.name,
      p.controller_ip,
      p.lane_ids,
      p.signal_group,
      p.status,
      ST_AsGeoJSON(p.polygon)::json AS polygon,
      ST_AsGeoJSON(p.entry_line)::json AS entry_line,
      ST_AsGeoJSON(p.exit_line)::json AS exit_line,
      p.created_at,
      p.updated_at
    FROM preemption_zones p
    JOIN intersections i ON i.intersection_id = p.intersection_id
  `;
}

async function fetchZoneById(zoneId) {
  const result = await db.query(
    `${baseSelectSql()} WHERE p.id = $1 LIMIT 1`,
    [zoneId],
  );
  return result.rows[0] || null;
}

async function fetchSpatZoneSource(sourceSpatZoneId) {
  const result = await db.query(
    `SELECT
       id,
       intersection_id,
       lane_ids,
       signal_group,
       ST_AsGeoJSON(polygon)::json AS polygon,
       ST_AsGeoJSON(entry_line)::json AS entry_line,
       ST_AsGeoJSON(exit_line)::json AS exit_line
     FROM spat_zones
     WHERE id = $1
     LIMIT 1`,
    [sourceSpatZoneId],
  );
  return result.rows[0] || null;
}

// GET zones (optionally filtered by intersection)
router.get("/", async (req, res) => {
  try {
    if (req.query.intersection_number != null && String(req.query.intersection_number).trim() !== "") {
      return res.status(400).json({
        error: "intersection_number is no longer supported; use intersection_id",
      });
    }

    const resolved = await resolveIntersectionIdFromQuery(req.query.intersection_id);

    if (resolved.error) {
      return res.status(400).json({ error: resolved.error });
    }

    const params = [];
    let sql = baseSelectSql();

    if (resolved.intersectionId != null) {
      sql += " WHERE p.intersection_id = $1";
      params.push(resolved.intersectionId);
    }

    sql += " ORDER BY p.created_at DESC";

    const result = await db.query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching preemption zones:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET single preemption zone by zone id
router.get("/:id", async (req, res) => {
  try {
    const zoneId = parseFiniteNumber(req.params.id);
    if (zoneId == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const zone = await fetchZoneById(zoneId);
    if (!zone) {
      return res.status(404).json({ error: "Preemption zone not found" });
    }

    return res.json(zone);
  } catch (err) {
    console.error("Error fetching preemption zone:", err);
    return res.status(500).json({ error: err.message });
  }
});

// CREATE independent preemption zone
// Body:
//   - name (required)
//   - intersection_id (required; user-entered canonical intersection_id)
//   - controller_ip (optional)
//   - status (optional)
//   - source_spat_zone_id (optional; copies geometry, lanes, and signal group from SPaT zone)
//   - OR provide lane_ids, signal_group, polygon, entry_line, exit_line directly
router.post("/", async (req, res) => {
  try {
    const {
      name,
      intersection_id,
      controller_ip,
      status,
      source_spat_zone_id,
      lane_ids,
      signal_group,
      polygon,
      entry_line,
      exit_line,
    } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }

    const intersectionId = parseCanonicalIntersectionId(intersection_id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    if (!(await ensureIntersectionExists(intersectionId))) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    const dup = await db.query(
      "SELECT 1 FROM preemption_zones WHERE intersection_id = $1 AND lower(name) = lower($2) LIMIT 1",
      [intersectionId, name.trim()],
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: `Preemption zone name '${name.trim()}' already exists for this intersection` });
    }

    const sourceSpatZoneId = source_spat_zone_id != null
      ? parseFiniteNumber(source_spat_zone_id)
      : null;

    if (source_spat_zone_id != null && sourceSpatZoneId == null) {
      return res.status(400).json({ error: "source_spat_zone_id must be a number" });
    }

    const hasManualGeometry =
      lane_ids !== undefined ||
      signal_group !== undefined ||
      polygon !== undefined ||
      entry_line !== undefined ||
      exit_line !== undefined;

    if (sourceSpatZoneId != null && hasManualGeometry) {
      return res.status(400).json({
        error: "Provide either source_spat_zone_id or manual lane/geometry fields, not both",
      });
    }

    let laneIds;
    let signalGroup;
    let zonePolygon;
    let entryLine;
    let exitLine;

    if (sourceSpatZoneId != null) {
      const sourceZone = await fetchSpatZoneSource(sourceSpatZoneId);
      if (!sourceZone) {
        return res.status(404).json({ error: "Source SPaT zone not found" });
      }
      if (sourceZone.intersection_id !== intersectionId) {
        return res.status(400).json({
          error: "source_spat_zone_id must belong to the same intersection",
        });
      }

      laneIds = sourceZone.lane_ids || [];
      signalGroup = sourceZone.signal_group;
      zonePolygon = sourceZone.polygon;
      entryLine = sourceZone.entry_line;
      exitLine = sourceZone.exit_line;
    } else {
      laneIds = normalizeLaneIds(lane_ids);
      if (!laneIds || laneIds.length === 0) {
        return res.status(400).json({
          error: "lane_ids must be a non-empty array of lane DB ids when source_spat_zone_id is not provided",
        });
      }

      signalGroup = parseFiniteNumber(signal_group);
      if (signalGroup == null) {
        return res.status(400).json({
          error: "signal_group must be a number when source_spat_zone_id is not provided",
        });
      }

      zonePolygon = polygon;
      entryLine = entry_line;
      exitLine = exit_line;

      const geoErr = validateGeoJsonTypes({
        polygon: zonePolygon,
        entry_line: entryLine,
        exit_line: exitLine,
      });
      if (geoErr) {
        return res.status(400).json({ error: geoErr });
      }
    }

    const laneCheck = await ensureLaneIdsBelongToIntersection(intersectionId, laneIds);
    if (!laneCheck.ok) {
      return res.status(400).json({
        error: `Invalid lane_ids for intersection_id=${intersectionId}: ${laneCheck.missing.join(", ")}`,
      });
    }

    const result = await db.query(
      `INSERT INTO preemption_zones (
         name, intersection_id, controller_ip, lane_ids, signal_group, polygon, entry_line, exit_line, status
       )
       VALUES (
         $1, $2, $3, $4, $5,
         ST_SetSRID(ST_GeomFromGeoJSON($6), 4326),
         ST_SetSRID(ST_GeomFromGeoJSON($7), 4326),
         ST_SetSRID(ST_GeomFromGeoJSON($8), 4326),
         $9
       )
       RETURNING id`,
      [
        name.trim(),
        intersectionId,
        normalizeControllerIp(controller_ip),
        laneIds,
        signalGroup,
        JSON.stringify(zonePolygon),
        JSON.stringify(entryLine),
        JSON.stringify(exitLine),
        status || "active",
      ],
    );

    const zone = await fetchZoneById(result.rows[0].id);
    return res.status(201).json(zone);
  } catch (err) {
    console.error("Error creating preemption zone:", err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE independent preemption zone
router.put("/:id", async (req, res) => {
  try {
    const zoneId = parseFiniteNumber(req.params.id);
    if (zoneId == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const existing = await db.query(
      "SELECT id, intersection_id FROM preemption_zones WHERE id = $1 LIMIT 1",
      [zoneId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Preemption zone not found" });
    }

    const intersectionId = existing.rows[0].intersection_id;
    const {
      intersection_id,
      name,
      controller_ip,
      lane_ids,
      signal_group,
      polygon,
      entry_line,
      exit_line,
      status,
    } = req.body;

    if (intersection_id !== undefined) {
      const requestedIntersectionId = parseCanonicalIntersectionId(intersection_id);
      if (requestedIntersectionId == null) {
        return res.status(400).json({ error: "intersection_id must be a number" });
      }
      if (requestedIntersectionId !== intersectionId) {
        return res.status(400).json({ error: "intersection_id cannot be changed for an existing preemption zone" });
      }
    }

    if (name !== undefined && !isNonEmptyString(name)) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }

    if (name !== undefined) {
      const dup = await db.query(
        "SELECT 1 FROM preemption_zones WHERE intersection_id = $1 AND lower(name) = lower($2) AND id <> $3 LIMIT 1",
        [intersectionId, name.trim(), zoneId],
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: `Preemption zone name '${name.trim()}' already exists for this intersection` });
      }
    }

    const laneIds = lane_ids !== undefined ? normalizeLaneIds(lane_ids) : null;
    if (lane_ids !== undefined && (!laneIds || laneIds.length === 0)) {
      return res.status(400).json({ error: "lane_ids must be a non-empty array of lane DB ids" });
    }

    if (laneIds) {
      const laneCheck = await ensureLaneIdsBelongToIntersection(intersectionId, laneIds);
      if (!laneCheck.ok) {
        return res.status(400).json({
          error: `Invalid lane_ids for intersection_id=${intersectionId}: ${laneCheck.missing.join(", ")}`,
        });
      }
    }

    if (signal_group !== undefined && parseFiniteNumber(signal_group) == null) {
      return res.status(400).json({ error: "signal_group must be a number" });
    }

    if (polygon !== undefined && (!polygon || polygon.type !== "Polygon")) {
      return res.status(400).json({ error: "polygon must be a GeoJSON Polygon" });
    }
    if (entry_line !== undefined && (!entry_line || entry_line.type !== "LineString")) {
      return res.status(400).json({ error: "entry_line must be a GeoJSON LineString" });
    }
    if (exit_line !== undefined && (!exit_line || exit_line.type !== "LineString")) {
      return res.status(400).json({ error: "exit_line must be a GeoJSON LineString" });
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name.trim()); }
    if (controller_ip !== undefined) { sets.push(`controller_ip = $${idx++}`); vals.push(normalizeControllerIp(controller_ip)); }
    if (lane_ids !== undefined) { sets.push(`lane_ids = $${idx++}`); vals.push(laneIds); }
    if (signal_group !== undefined) { sets.push(`signal_group = $${idx++}`); vals.push(parseFiniteNumber(signal_group)); }
    if (polygon !== undefined) { sets.push(`polygon = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(polygon)); }
    if (entry_line !== undefined) { sets.push(`entry_line = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(entry_line)); }
    if (exit_line !== undefined) { sets.push(`exit_line = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(exit_line)); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(zoneId);
    await db.query(
      `UPDATE preemption_zones
       SET ${sets.join(", ")}
       WHERE id = $${idx}`,
      vals,
    );

    const zone = await fetchZoneById(zoneId);
    return res.json(zone);
  } catch (err) {
    console.error("Error updating preemption zone:", err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE independent preemption zone
router.delete("/:id", async (req, res) => {
  try {
    const zoneId = parseFiniteNumber(req.params.id);
    if (zoneId == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const result = await db.query(
      "DELETE FROM preemption_zones WHERE id = $1 RETURNING id",
      [zoneId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Preemption zone not found" });
    }

    return res.json({ message: "Preemption zone deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting preemption zone:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
