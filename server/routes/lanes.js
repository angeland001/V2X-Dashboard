const express = require("express");
const router = express.Router();
const db = require("../database/postgis");

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
      JOIN intersections i ON i.id = l.intersection_id
    `;
    const params = [];
    if (intersection_id) {
      query += " WHERE l.intersection_id = $1";
      params.push(intersection_id);
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
       JOIN intersections i ON i.id = l.intersection_id
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
router.post("/", async (req, res) => {
  try {
    const { intersection_id, geometry, lane_type, phase, name, lane_number, metadata } = req.body;

    if (!intersection_id || !geometry) {
      return res.status(400).json({ error: "intersection_id and geometry (GeoJSON LineString) are required" });
    }

    const result = await db.query(
      `INSERT INTO lanes (intersection_id, geometry, lane_type, phase, name, lane_number, metadata)
       VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6, $7)
       RETURNING id, intersection_id,
                 ST_AsGeoJSON(geometry)::json AS geometry,
                 lane_type, phase, name, lane_number, metadata,
                 created_at, updated_at`,
      [
        intersection_id,
        JSON.stringify(geometry),
        lane_type || "Vehicle",
        phase || null,
        name || null,
        lane_number || null,
        metadata ? JSON.stringify(metadata) : "{}",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating lane:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE lane ─────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { geometry, lane_type, phase, name, lane_number, metadata } = req.body;

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
