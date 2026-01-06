/**
 * Geofence API Routes
 *
 * Endpoints for managing geofences in PostGIS database
 * Supports creating, reading, updating, and deleting geofences
 */

const express = require('express');
const router = express.Router();
const db = require('../database/postgis');

/**
 * GET /api/geofences
 * Fetch all geofences from database
 * Returns GeoJSON format compatible with Kepler.gl
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        description,
        geofence_type,
        status,
        metadata,
        ST_AsGeoJSON(geometry)::json as geometry,
        created_at,
        updated_at
      FROM geofences
      WHERE status = 'active'
      ORDER BY created_at DESC;
    `);

    // Format as GeoJSON FeatureCollection for Kepler.gl
    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        id: row.id,
        geometry: row.geometry,
        properties: {
          id: row.id,
          name: row.name,
          description: row.description,
          geofence_type: row.geofence_type,
          status: row.status,
          metadata: row.metadata,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      }))
    };

    res.json(geojson);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({
      error: 'Failed to fetch geofences',
      message: error.message
    });
  }
});

/**
 * GET /api/geofences/:id
 * Fetch a single geofence by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        id,
        name,
        description,
        geofence_type,
        status,
        metadata,
        ST_AsGeoJSON(geometry)::json as geometry,
        created_at,
        updated_at
      FROM geofences
      WHERE id = $1;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const row = result.rows[0];
    const feature = {
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        description: row.description,
        geofence_type: row.geofence_type,
        status: row.status,
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    };

    res.json(feature);
  } catch (error) {
    console.error('Error fetching geofence:', error);
    res.status(500).json({
      error: 'Failed to fetch geofence',
      message: error.message
    });
  }
});

/**
 * POST /api/geofences
 * Create a new geofence from drawn polygon
 *
 * Expected body:
 * {
 *   name: string,
 *   description?: string,
 *   geofence_type?: string,
 *   geometry: GeoJSON Polygon geometry,
 *   metadata?: object
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description = '',
      geofence_type = 'zone',
      geometry,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!geometry || geometry.type !== 'Polygon') {
      return res.status(400).json({
        error: 'Valid Polygon geometry is required',
        received: geometry?.type
      });
    }

    // Convert GeoJSON to PostGIS geometry
    const result = await db.query(`
      INSERT INTO geofences (
        name,
        description,
        geofence_type,
        geometry,
        metadata,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
        $5,
        'active'
      )
      RETURNING
        id,
        name,
        description,
        geofence_type,
        status,
        metadata,
        ST_AsGeoJSON(geometry)::json as geometry,
        created_at,
        updated_at;
    `, [
      name,
      description,
      geofence_type,
      JSON.stringify(geometry),
      JSON.stringify(metadata)
    ]);

    const row = result.rows[0];
    const feature = {
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        description: row.description,
        geofence_type: row.geofence_type,
        status: row.status,
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    };

    console.log(`✓ Created geofence: ${name} (ID: ${row.id})`);
    res.status(201).json(feature);
  } catch (error) {
    console.error('Error creating geofence:', error);
    res.status(500).json({
      error: 'Failed to create geofence',
      message: error.message
    });
  }
});

/**
 * PUT /api/geofences/:id
 * Update an existing geofence
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      geofence_type,
      geometry,
      metadata,
      status
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (geofence_type !== undefined) {
      updates.push(`geofence_type = $${paramCount++}`);
      values.push(geofence_type);
    }
    if (geometry !== undefined) {
      updates.push(`geometry = ST_SetSRID(ST_GeomFromGeoJSON($${paramCount++}), 4326)`);
      values.push(JSON.stringify(geometry));
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(metadata));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(`
      UPDATE geofences
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id,
        name,
        description,
        geofence_type,
        status,
        metadata,
        ST_AsGeoJSON(geometry)::json as geometry,
        created_at,
        updated_at;
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const row = result.rows[0];
    const feature = {
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        description: row.description,
        geofence_type: row.geofence_type,
        status: row.status,
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    };

    console.log(`✓ Updated geofence: ${row.name} (ID: ${row.id})`);
    res.json(feature);
  } catch (error) {
    console.error('Error updating geofence:', error);
    res.status(500).json({
      error: 'Failed to update geofence',
      message: error.message
    });
  }
});

/**
 * DELETE /api/geofences/:id
 * Delete a geofence (soft delete by setting status to 'archived')
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hard = false } = req.query;

    if (hard === 'true') {
      // Hard delete - permanently remove from database
      const result = await db.query(`
        DELETE FROM geofences
        WHERE id = $1
        RETURNING id, name;
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Geofence not found' });
      }

      console.log(`✓ Permanently deleted geofence: ${result.rows[0].name} (ID: ${id})`);
      res.json({
        message: 'Geofence permanently deleted',
        id: result.rows[0].id,
        name: result.rows[0].name
      });
    } else {
      // Soft delete - set status to archived
      const result = await db.query(`
        UPDATE geofences
        SET status = 'archived', updated_at = NOW()
        WHERE id = $1
        RETURNING id, name;
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Geofence not found' });
      }

      console.log(`✓ Archived geofence: ${result.rows[0].name} (ID: ${id})`);
      res.json({
        message: 'Geofence archived',
        id: result.rows[0].id,
        name: result.rows[0].name
      });
    }
  } catch (error) {
    console.error('Error deleting geofence:', error);
    res.status(500).json({
      error: 'Failed to delete geofence',
      message: error.message
    });
  }
});

/**
 * POST /api/geofences/check-point
 * Check if a point is inside any geofence
 *
 * Body: { longitude: number, latitude: number }
 */
router.post('/check-point', async (req, res) => {
  try {
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        error: 'Longitude and latitude are required'
      });
    }

    const result = await db.query(`
      SELECT * FROM check_point_in_geofences($1, $2);
    `, [longitude, latitude]);

    res.json({
      point: { longitude, latitude },
      geofences: result.rows
    });
  } catch (error) {
    console.error('Error checking point:', error);
    res.status(500).json({
      error: 'Failed to check point',
      message: error.message
    });
  }
});

module.exports = router;
