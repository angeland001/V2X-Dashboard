const express = require("express");
const router = express.Router();
const db = require("../../database/postgis");
const { parseCanonicalIntersectionId } = require("../../utils/intersectionIdentity");

// ─── GET connections (optionally filtered by intersection_id) ──────
router.get("/", async (req, res) => {
  try {
    const { intersection_id } = req.query;
    let query = `
      SELECT lc.id, lc.from_lane_id, lc.to_lane_id, lc.signal_group,
             fl.lane_number AS from_lane_number,
             tl.lane_number AS to_lane_number,
             fl.name AS from_lane_name,
             tl.name AS to_lane_name,
             lc.created_at
      FROM lane_connections lc
      JOIN lanes fl ON fl.id = lc.from_lane_id
      JOIN lanes tl ON tl.id = lc.to_lane_id
    `;
    const params = [];
    if (intersection_id) {
      const canonicalIntersectionId = parseCanonicalIntersectionId(intersection_id);
      if (canonicalIntersectionId == null) {
        return res.status(400).json({ error: "intersection_id must be a number" });
      }
      query += " WHERE fl.intersection_id = $1";
      params.push(canonicalIntersectionId);
    }
    query += " ORDER BY lc.id";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching lane connections:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE connection ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { from_lane_id, to_lane_id, signal_group } = req.body;

    if (!from_lane_id || !to_lane_id) {
      return res.status(400).json({ error: "from_lane_id and to_lane_id are required" });
    }

    const result = await db.query(
      `INSERT INTO lane_connections (from_lane_id, to_lane_id, signal_group)
       VALUES ($1, $2, $3)
       RETURNING id, from_lane_id, to_lane_id, signal_group, created_at`,
      [from_lane_id, to_lane_id, signal_group || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This connection already exists" });
    }
    console.error("Error creating lane connection:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE connection ─────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM lane_connections WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json({ message: "Connection deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting lane connection:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
