/**
 * Simple Spatial Data Routes
 *
 * Basic API endpoints to get spatial data for Kepler.gl
 */

const express = require('express');
const router = express.Router();
const db = require('../database/postgis');

// Get spatial data for Kepler.gl
router.get('/data', async (req, res) => {
  try {
    // Example query - fetch points from your spatial table
    const result = await db.query(`
      SELECT
        id,
        name,
        ST_X(location) as longitude,
        ST_Y(location) as latitude
      FROM spatial_data
      LIMIT 10000;
    `);

    // Format for Kepler.gl
    const keplerData = {
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'longitude', type: 'real' },
        { name: 'latitude', type: 'real' }
      ],
      rows: result.rows.map(row => [
        row.id,
        row.name,
        row.longitude,
        row.latitude
      ])
    };

    res.json(keplerData);
  } catch (error) {
    console.error('Error fetching spatial data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new point
router.post('/data', async (req, res) => {
  try {
    const { name, latitude, longitude } = req.body;

    const result = await db.query(`
      INSERT INTO spatial_data (name, location)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326))
      RETURNING id, name, ST_X(location) as longitude, ST_Y(location) as latitude;
    `, [name, longitude, latitude]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding spatial data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
