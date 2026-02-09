const express = require("express");
const router = express.Router();
const db = require("../../database/postgis");

// ─── GET all crosswalks (optionally filtered by intersection_id) ─
router.get("/", async (req, res) => {
  try {
    const { intersection_id } = req.query;
    let query = `
      SELECT c.id, c.intersection_id, i.name AS intersection_name,
             ST_AsGeoJSON(c.geometry)::json AS geometry,
             c.approach_type, c.approach_id, c.name, c.metadata,
             c.created_at, c.updated_at
      FROM crosswalks c
      JOIN intersections i ON i.id = c.intersection_id
    `;
    const params = [];
    if (intersection_id) {
      query += " WHERE c.intersection_id = $1";
      params.push(intersection_id);
    }
    query += " ORDER BY c.intersection_id, c.approach_id, c.id";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching crosswalks:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single crosswalk ────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT c.id, c.intersection_id, i.name AS intersection_name,
              ST_AsGeoJSON(c.geometry)::json AS geometry,
              c.approach_type, c.approach_id, c.name, c.metadata,
              c.created_at, c.updated_at
       FROM crosswalks c
       JOIN intersections i ON i.id = c.intersection_id
       WHERE c.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Crosswalk not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching crosswalk:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE crosswalk ────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { intersection_id, geometry, approach_type, approach_id, name, metadata } = req.body;

    if (!intersection_id || !geometry) {
      return res.status(400).json({ error: "intersection_id and geometry (GeoJSON Polygon) are required" });
    }

    const result = await db.query(
      `INSERT INTO crosswalks (intersection_id, geometry, approach_type, approach_id, name, metadata)
       VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, $5, $6)
       RETURNING id, intersection_id,
                 ST_AsGeoJSON(geometry)::json AS geometry,
                 approach_type, approach_id, name, metadata,
                 created_at, updated_at`,
      [
        intersection_id,
        JSON.stringify(geometry),
        approach_type || "Both",
        approach_id || null,
        name || null,
        metadata ? JSON.stringify(metadata) : "{}",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating crosswalk:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE crosswalk ────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { geometry, approach_type, approach_id, name, metadata } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (geometry !== undefined) {
      sets.push(`geometry = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`);
      vals.push(JSON.stringify(geometry));
    }
    if (approach_type !== undefined) { sets.push(`approach_type = $${idx++}`); vals.push(approach_type); }
    if (approach_id !== undefined) { sets.push(`approach_id = $${idx++}`); vals.push(approach_id); }
    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (metadata !== undefined) { sets.push(`metadata = $${idx++}`); vals.push(JSON.stringify(metadata)); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    vals.push(id);
    const result = await db.query(
      `UPDATE crosswalks SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, intersection_id,
                 ST_AsGeoJSON(geometry)::json AS geometry,
                 approach_type, approach_id, name, metadata,
                 created_at, updated_at`,
      vals
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Crosswalk not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating crosswalk:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE crosswalk ────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM crosswalks WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Crosswalk not found" });
    }
    res.json({ message: "Crosswalk deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting crosswalk:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
