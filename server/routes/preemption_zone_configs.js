const express = require("express");
const router = express.Router();
const db = require("../database/postgis");

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function resolveIntersectionIdFromQuery(intersectionIdRaw, intersectionNumberRaw) {
  if (intersectionIdRaw != null && String(intersectionIdRaw).trim() !== "") {
    const intersectionId = parseFiniteNumber(intersectionIdRaw);
    if (intersectionId == null) {
      return { error: "intersection_id must be a number" };
    }
    return { intersectionId };
  }

  if (intersectionNumberRaw != null && String(intersectionNumberRaw).trim() !== "") {
    const intersectionNumber = parseFiniteNumber(intersectionNumberRaw);
    if (intersectionNumber == null) {
      return { error: "intersection_number must be a number" };
    }
    const found = await db.query(
      "SELECT id FROM intersections WHERE intersection_id = $1 LIMIT 1",
      [intersectionNumber],
    );
    if (found.rows.length === 0) {
      return { notFound: `No intersection found for intersection_number=${intersectionNumber}` };
    }
    return { intersectionId: found.rows[0].id };
  }

  return { error: "intersection_id (or intersection_number) is required" };
}

async function fetchConfig(intersectionId) {
  const result = await db.query(
    `SELECT
       c.intersection_id,
       c.spat_zone_id,
       c.updated_at,
       z.name AS zone_name,
       z.lane_ids,
       z.signal_group
     FROM preemption_zone_configs c
     JOIN spat_zones z ON z.id = c.spat_zone_id
     WHERE c.intersection_id = $1
     LIMIT 1`,
    [intersectionId],
  );
  return result.rows[0] || null;
}

// GET config for an intersection
// Query params:
//   - intersection_id: intersections.id
//   - intersection_number: intersections.intersection_id (J2735 id)
router.get("/", async (req, res) => {
  try {
    const resolved = await resolveIntersectionIdFromQuery(
      req.query.intersection_id,
      req.query.intersection_number,
    );

    if (resolved.error) {
      return res.status(400).json({ error: resolved.error });
    }
    if (resolved.notFound) {
      return res.status(404).json({ error: resolved.notFound });
    }

    const config = await fetchConfig(resolved.intersectionId);
    return res.json(config);
  } catch (err) {
    console.error("Error fetching preemption zone config:", err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT config for an intersection
// Body:
//   - intersection_id (required)
//   - spat_zone_id (required; pass null to clear)
router.put("/", async (req, res) => {
  try {
    const intersectionId = parseFiniteNumber(req.body.intersection_id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }

    const intersectionRow = await db.query(
      "SELECT id FROM intersections WHERE id = $1 LIMIT 1",
      [intersectionId],
    );
    if (intersectionRow.rows.length === 0) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    const hasSpatZoneId = Object.prototype.hasOwnProperty.call(req.body, "spat_zone_id");
    if (!hasSpatZoneId) {
      return res.status(400).json({ error: "spat_zone_id is required (use null to clear)" });
    }

    // Clear selection
    if (req.body.spat_zone_id == null) {
      await db.query(
        "DELETE FROM preemption_zone_configs WHERE intersection_id = $1",
        [intersectionId],
      );
      return res.json({
        intersection_id: intersectionId,
        spat_zone_id: null,
      });
    }

    const spatZoneId = parseFiniteNumber(req.body.spat_zone_id);
    if (spatZoneId == null) {
      return res.status(400).json({ error: "spat_zone_id must be a number or null" });
    }

    const zoneRow = await db.query(
      "SELECT id, intersection_id FROM spat_zones WHERE id = $1 LIMIT 1",
      [spatZoneId],
    );
    if (zoneRow.rows.length === 0) {
      return res.status(404).json({ error: "SPaT zone not found" });
    }
    if (zoneRow.rows[0].intersection_id !== intersectionId) {
      return res.status(400).json({
        error: "spat_zone_id must belong to the same intersection",
      });
    }

    await db.query(
      `INSERT INTO preemption_zone_configs (intersection_id, spat_zone_id)
       VALUES ($1, $2)
       ON CONFLICT (intersection_id)
       DO UPDATE SET
         spat_zone_id = EXCLUDED.spat_zone_id,
         updated_at = NOW()`,
      [intersectionId, spatZoneId],
    );

    const config = await fetchConfig(intersectionId);
    return res.json(config);
  } catch (err) {
    console.error("Error updating preemption zone config:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
