const express = require("express");
const router = express.Router();
const db = require("../database/postgis");
const { parseCanonicalIntersectionId } = require("../utils/intersectionIdentity");

function parseZoneId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeControllerIp(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

async function ensureIntersectionExists(intersectionId) {
  const result = await db.query(
    "SELECT 1 FROM intersections WHERE intersection_id = $1 LIMIT 1",
    [intersectionId],
  );
  return result.rows.length > 0;
}

async function fetchSpatZoneSource(sourceSpatZoneId) {
  const result = await db.query(
    `SELECT
       id,
       name AS spat_zone_name,
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

function baseSelectSql() {
  return `
    SELECT
      c.id,
      c.intersection_id,
      i.name AS intersection_name,
      c.name,
      c.spat_zone_id,
      z.name AS spat_zone_name,
      c.controller_ip,
      c.lane_ids,
      c.signal_group,
      c.status,
      ST_AsGeoJSON(c.polygon)::json AS polygon,
      ST_AsGeoJSON(c.entry_line)::json AS entry_line,
      ST_AsGeoJSON(c.exit_line)::json AS exit_line,
      c.created_at,
      c.updated_at
    FROM preemption_zone_configs c
    LEFT JOIN spat_zones z ON z.id = c.spat_zone_id
    JOIN intersections i ON i.intersection_id = c.intersection_id
  `;
}

async function fetchConfigById(id) {
  const result = await db.query(
    `${baseSelectSql()} WHERE c.id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
}

async function fetchConfigBySpatZoneId(spatZoneId) {
  const result = await db.query(
    `${baseSelectSql()}
     WHERE c.spat_zone_id = $1
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT 1`,
    [spatZoneId],
  );
  return result.rows[0] || null;
}

router.get("/", async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.query, "spat_zone_id")) {
      const spatZoneId = parseZoneId(req.query.spat_zone_id);
      if (spatZoneId == null) {
        return res.status(400).json({ error: "spat_zone_id must be a number" });
      }

      const config = await fetchConfigBySpatZoneId(spatZoneId);
      return res.json(config);
    }

    const intersectionId = parseCanonicalIntersectionId(req.query.intersection_id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id is required and must be a number" });
    }

    const result = await db.query(
      `${baseSelectSql()}
       WHERE c.intersection_id = $1
       ORDER BY c.created_at DESC, c.id DESC`,
      [intersectionId],
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching preemption zone configs:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseZoneId(req.params.id);
    if (id == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const config = await fetchConfigById(id);
    if (!config) {
      return res.status(404).json({ error: "Preemption zone config not found" });
    }

    return res.json(config);
  } catch (err) {
    console.error("Error fetching preemption zone config by id:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      intersection_id,
      name,
      source_spat_zone_id,
      controller_ip,
      status,
    } = req.body;

    const intersectionId = parseCanonicalIntersectionId(intersection_id);
    if (intersectionId == null) {
      return res.status(400).json({ error: "intersection_id must be a number" });
    }
    if (!(await ensureIntersectionExists(intersectionId))) {
      return res.status(404).json({ error: "Intersection not found" });
    }

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    const trimmedName = name.trim();

    const sourceSpatZoneId = parseZoneId(source_spat_zone_id);
    if (sourceSpatZoneId == null) {
      return res.status(400).json({ error: "source_spat_zone_id must be a number" });
    }

    const duplicate = await db.query(
      "SELECT 1 FROM preemption_zone_configs WHERE intersection_id = $1 AND lower(name) = lower($2) LIMIT 1",
      [intersectionId, trimmedName],
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        error: `Preemption zone config name '${trimmedName}' already exists for this intersection`,
      });
    }

    const sourceZone = await fetchSpatZoneSource(sourceSpatZoneId);
    if (!sourceZone) {
      return res.status(404).json({ error: "Source SPaT zone not found" });
    }
    if (sourceZone.intersection_id !== intersectionId) {
      return res.status(400).json({
        error: "source_spat_zone_id must belong to the same intersection",
      });
    }

    const insertResult = await db.query(
      `INSERT INTO preemption_zone_configs (
         intersection_id, name, spat_zone_id, controller_ip, lane_ids, signal_group, polygon, entry_line, exit_line, status
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         ST_SetSRID(ST_GeomFromGeoJSON($7), 4326),
         ST_SetSRID(ST_GeomFromGeoJSON($8), 4326),
         ST_SetSRID(ST_GeomFromGeoJSON($9), 4326),
         $10
       )
       RETURNING id`,
      [
        intersectionId,
        trimmedName,
        sourceSpatZoneId,
        normalizeControllerIp(controller_ip),
        sourceZone.lane_ids || [],
        sourceZone.signal_group,
        JSON.stringify(sourceZone.polygon),
        JSON.stringify(sourceZone.entry_line),
        JSON.stringify(sourceZone.exit_line),
        status || "active",
      ],
    );

    const config = await fetchConfigById(insertResult.rows[0].id);
    return res.status(201).json(config);
  } catch (err) {
    console.error("Error creating preemption zone config:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseZoneId(req.params.id);
    if (id == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const existing = await fetchConfigById(id);
    if (!existing) {
      return res.status(404).json({ error: "Preemption zone config not found" });
    }

    if (req.body.intersection_id !== undefined) {
      const requestedIntersectionId = parseCanonicalIntersectionId(req.body.intersection_id);
      if (requestedIntersectionId == null) {
        return res.status(400).json({ error: "intersection_id must be a number" });
      }
      if (requestedIntersectionId !== existing.intersection_id) {
        return res.status(400).json({ error: "intersection_id cannot be changed for an existing preemption zone config" });
      }
    }

    const immutableFields = [
      "source_spat_zone_id",
      "spat_zone_id",
      "lane_ids",
      "signal_group",
      "polygon",
      "entry_line",
      "exit_line",
    ];
    const attemptedImmutableField = immutableFields.find((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );
    if (attemptedImmutableField) {
      return res.status(400).json({
        error: `${attemptedImmutableField} cannot be changed in this phase`,
      });
    }

    const sets = [];
    const values = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      if (!isNonEmptyString(req.body.name)) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      const trimmedName = req.body.name.trim();

      const duplicate = await db.query(
        "SELECT 1 FROM preemption_zone_configs WHERE intersection_id = $1 AND lower(name) = lower($2) AND id <> $3 LIMIT 1",
        [existing.intersection_id, trimmedName, id],
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          error: `Preemption zone config name '${trimmedName}' already exists for this intersection`,
        });
      }

      sets.push(`name = $${idx++}`);
      values.push(trimmedName);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "controller_ip")) {
      sets.push(`controller_ip = $${idx++}`);
      values.push(normalizeControllerIp(req.body.controller_ip));
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      sets.push(`status = $${idx++}`);
      values.push(req.body.status);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    await db.query(
      `UPDATE preemption_zone_configs
       SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $${idx}`,
      values,
    );

    const updated = await fetchConfigById(id);
    return res.json(updated);
  } catch (err) {
    console.error("Error updating preemption zone config:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseZoneId(req.params.id);
    if (id == null) {
      return res.status(400).json({ error: "id must be a number" });
    }

    const result = await db.query(
      "DELETE FROM preemption_zone_configs WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Preemption zone config not found" });
    }

    return res.json({ message: "Preemption zone config deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting preemption zone config:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
