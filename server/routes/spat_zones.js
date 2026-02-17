const express = require("express");
const router = express.Router();
const db = require("../database/postgis");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function parseFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeLaneIds(v) {
  if (!Array.isArray(v)) return null;
  const nums = v
    .map((x) => parseFiniteNumber(x))
    .filter((x) => x != null)
    .map((x) => Math.trunc(x));
  // De-dupe while preserving sort order for stable storage
  const uniq = Array.from(new Set(nums));
  uniq.sort((a, b) => a - b);
  return uniq;
}

function validateGeoJsonTypes({ polygon, entry_line, exit_line }) {
  if (!polygon || polygon.type !== "Polygon") return "polygon must be a GeoJSON Polygon";
  if (!entry_line || entry_line.type !== "LineString") return "entry_line must be a GeoJSON LineString";
  if (!exit_line || exit_line.type !== "LineString") return "exit_line must be a GeoJSON LineString";
  return null;
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

// GET zones (optionally filtered by intersection)
// - intersection_id: intersections.id (DB primary key)
// - intersection_number: intersections.intersection_id (J2735 / human-entered intersection number)
router.get("/", async (req, res) => {
  try {
    const { intersection_id, intersection_number } = req.query;
    const params = [];
    let resolvedIntersectionId = null;

    // Prefer DB id if provided.
    if (intersection_id != null && String(intersection_id).trim() !== "") {
      const n = Number(intersection_id);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: "intersection_id must be a number" });
      }
      resolvedIntersectionId = n;
    } else if (intersection_number != null && String(intersection_number).trim() !== "") {
      const n = Number(intersection_number);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: "intersection_number must be a number" });
      }
      const found = await db.query(
        "SELECT id FROM intersections WHERE intersection_id = $1 LIMIT 1",
        [n],
      );
      if (found.rows.length === 0) {
        return res.status(404).json({ error: `No intersection found for intersection_number=${n}` });
      }
      resolvedIntersectionId = found.rows[0].id;
    }

    let sql = `
      SELECT id, name, intersection_id, lane_ids, signal_group, status,
             ST_AsGeoJSON(polygon)::json AS polygon,
             ST_AsGeoJSON(entry_line)::json AS entry_line,
             ST_AsGeoJSON(exit_line)::json AS exit_line,
             created_at, updated_at
      FROM spat_zones
    `;
    if (resolvedIntersectionId != null) {
      sql += " WHERE intersection_id = $1";
      params.push(resolvedIntersectionId);
    }
    sql += " ORDER BY created_at DESC";

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching SPaT zones:", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE zone
router.post("/", async (req, res) => {
  try {
    const {
      name,
      intersection_id,
      lane_ids,
      signal_group,
      polygon,
      entry_line,
      exit_line,
      status,
    } = req.body;

    if (!name || !intersection_id || !lane_ids || !signal_group || !polygon || !entry_line || !exit_line) {
      return res.status(400).json({ error: "name, intersection_id, lane_ids, signal_group, polygon, entry_line, and exit_line are required" });
    }

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    const intersectionId = parseFiniteNumber(intersection_id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }
    const laneIds = normalizeLaneIds(lane_ids);
    if (!laneIds || laneIds.length === 0) {
      return res.status(400).json({ error: "lane_ids must be a non-empty array of lane DB ids" });
    }
    const signalGroup = parseFiniteNumber(signal_group);
    if (signalGroup == null) {
      return res.status(400).json({ error: "signal_group must be a number" });
    }
    const geoErr = validateGeoJsonTypes({ polygon, entry_line, exit_line });
    if (geoErr) {
      return res.status(400).json({ error: geoErr });
    }

    // Prevent accidental duplicates (case-insensitive) per intersection
    const dup = await db.query(
      "SELECT 1 FROM spat_zones WHERE intersection_id = $1 AND lower(name) = lower($2) LIMIT 1",
      [intersectionId, name.trim()],
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: `SPaT zone name '${name.trim()}' already exists for this intersection` });
    }

    // Validate that lane ids are real and belong to the same intersection.
    const laneCheck = await ensureLaneIdsBelongToIntersection(intersectionId, laneIds);
    if (!laneCheck.ok) {
      return res.status(400).json({ error: `Invalid lane_ids for intersection_id=${intersectionId}: ${laneCheck.missing.join(", ")}` });
    }

    const result = await db.query(
      `INSERT INTO spat_zones (name, intersection_id, lane_ids, signal_group, polygon, entry_line, exit_line, status)
       VALUES ($1, $2, $3, $4,
               ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
               ST_SetSRID(ST_GeomFromGeoJSON($6), 4326),
               ST_SetSRID(ST_GeomFromGeoJSON($7), 4326),
               $8)
       RETURNING id, name, intersection_id, lane_ids, signal_group, status,
                 ST_AsGeoJSON(polygon)::json AS polygon,
                 ST_AsGeoJSON(entry_line)::json AS entry_line,
                 ST_AsGeoJSON(exit_line)::json AS exit_line,
                 created_at, updated_at`,
      [
        name.trim(),
        intersectionId,
        laneIds,
        signalGroup,
        JSON.stringify(polygon),
        JSON.stringify(entry_line),
        JSON.stringify(exit_line),
        status || "active",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating SPaT zone:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE zone
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lane_ids, signal_group, polygon, entry_line, exit_line, status } = req.body;

    const zoneRow = await db.query("SELECT id, intersection_id FROM spat_zones WHERE id = $1", [id]);
    if (zoneRow.rows.length === 0) {
      return res.status(404).json({ error: "SPaT zone not found" });
    }
    const intersectionId = zoneRow.rows[0].intersection_id;

    if (name !== undefined && !isNonEmptyString(name)) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    const laneIds = lane_ids !== undefined ? normalizeLaneIds(lane_ids) : null;
    if (lane_ids !== undefined && (!laneIds || laneIds.length === 0)) {
      return res.status(400).json({ error: "lane_ids must be a non-empty array of lane DB ids" });
    }
    if (signal_group !== undefined) {
      const sg = parseFiniteNumber(signal_group);
      if (sg == null) return res.status(400).json({ error: "signal_group must be a number" });
    }
    if (polygon !== undefined || entry_line !== undefined || exit_line !== undefined) {
      // Validate only provided geometry parts; allow partial updates.
      if (polygon !== undefined && (!polygon || polygon.type !== "Polygon")) {
        return res.status(400).json({ error: "polygon must be a GeoJSON Polygon" });
      }
      if (entry_line !== undefined && (!entry_line || entry_line.type !== "LineString")) {
        return res.status(400).json({ error: "entry_line must be a GeoJSON LineString" });
      }
      if (exit_line !== undefined && (!exit_line || exit_line.type !== "LineString")) {
        return res.status(400).json({ error: "exit_line must be a GeoJSON LineString" });
      }
    }

    // Duplicate name check within the same intersection (exclude current id)
    if (name !== undefined) {
      const dup = await db.query(
        "SELECT 1 FROM spat_zones WHERE intersection_id = $1 AND lower(name) = lower($2) AND id <> $3 LIMIT 1",
        [intersectionId, name.trim(), id],
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: `SPaT zone name '${name.trim()}' already exists for this intersection` });
      }
    }

    // Validate lane ids belong to the zone's intersection
    if (laneIds) {
      const laneCheck = await ensureLaneIdsBelongToIntersection(intersectionId, laneIds);
      if (!laneCheck.ok) {
        return res.status(400).json({ error: `Invalid lane_ids for intersection_id=${intersectionId}: ${laneCheck.missing.join(", ")}` });
      }
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name.trim()); }
    if (lane_ids !== undefined) { sets.push(`lane_ids = $${idx++}`); vals.push(laneIds); }
    if (signal_group !== undefined) { sets.push(`signal_group = $${idx++}`); vals.push(parseFiniteNumber(signal_group)); }
    if (polygon !== undefined) { sets.push(`polygon = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(polygon)); }
    if (entry_line !== undefined) { sets.push(`entry_line = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(entry_line)); }
    if (exit_line !== undefined) { sets.push(`exit_line = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`); vals.push(JSON.stringify(exit_line)); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(id);
    const result = await db.query(
      `UPDATE spat_zones SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, intersection_id, lane_ids, signal_group, status,
                 ST_AsGeoJSON(polygon)::json AS polygon,
                 ST_AsGeoJSON(entry_line)::json AS entry_line,
                 ST_AsGeoJSON(exit_line)::json AS exit_line,
                 created_at, updated_at`,
      vals
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating SPaT zone:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE zone
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM spat_zones WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "SPaT zone not found" });
    }
    res.json({ message: "SPaT zone deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting SPaT zone:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
