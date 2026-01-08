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
        g.id,
        g.name,
        g.description,
        g.geofence_type,
        g.status,
        g.metadata,
        g.created_by,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        ST_AsGeoJSON(g.geometry)::json as geometry,
        g.created_at,
        g.updated_at
      FROM geofences g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.status = 'active'
      ORDER BY g.created_at DESC;
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
          created_by: row.created_by,
          created_by_username: row.created_by_username,
          created_by_first_name: row.created_by_first_name,
          created_by_last_name: row.created_by_last_name,
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
        g.id,
        g.name,
        g.description,
        g.geofence_type,
        g.status,
        g.metadata,
        g.created_by,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        ST_AsGeoJSON(g.geometry)::json as geometry,
        g.created_at,
        g.updated_at
      FROM geofences g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = $1;
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
        created_by: row.created_by,
        created_by_username: row.created_by_username,
        created_by_first_name: row.created_by_first_name,
        created_by_last_name: row.created_by_last_name,
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
      metadata = {},
      created_by
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

    // Ensure coordinates are included in metadata for easy access
    const enrichedMetadata = {
      ...metadata,
      coordinates: geometry.coordinates
    };

    // Convert GeoJSON to PostGIS geometry
    const result = await db.query(`
      INSERT INTO geofences (
        name,
        description,
        geofence_type,
        geometry,
        metadata,
        status,
        created_by
      )
      VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
        $5,
        'active',
        $6
      )
      RETURNING
        id,
        name,
        description,
        geofence_type,
        status,
        metadata,
        created_by,
        ST_AsGeoJSON(geometry)::json as geometry,
        created_at,
        updated_at;
    `, [
      name,
      description,
      geofence_type,
      JSON.stringify(geometry),
      JSON.stringify(enrichedMetadata),
      created_by || null
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

      // If geometry is updated, also update coordinates in metadata
      // Use JSONB merge operator to preserve other metadata fields
      updates.push(`metadata = metadata || $${paramCount++}::jsonb`);
      values.push(JSON.stringify({ coordinates: geometry.coordinates }));
    }

    if (metadata !== undefined) {
      // If metadata is explicitly provided, merge it with coordinates if geometry exists
      const enrichedMetadata = geometry !== undefined
        ? { ...metadata, coordinates: geometry.coordinates }
        : metadata;
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(enrichedMetadata));
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
 * Delete a geofence (hard delete - permanently removes from database)
 * Use ?soft=true query parameter to archive instead
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { soft = false } = req.query;

    if (soft === 'true') {
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
    } else {
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
        message: 'Geofence deleted',
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
