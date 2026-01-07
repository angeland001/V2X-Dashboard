-- Add created_by field to geofences table to track which user created each geofence
-- Run this migration after the users table has been created

-- Add created_by column (nullable for existing records)
ALTER TABLE geofences
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS geofences_created_by_idx ON geofences(created_by);

-- Update the view to include creator information
CREATE OR REPLACE VIEW geofences_with_stats AS
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
  ST_AsGeoJSON(g.geometry)::jsonb as geometry_geojson,
  ST_Area(g.geometry::geography) as area_sq_meters,
  ST_Centroid(g.geometry) as centroid,
  COUNT(DISTINCT ge.id) as total_events,
  COUNT(DISTINCT ge.object_id) as unique_objects,
  MAX(ge.event_time) as last_event_time,
  g.created_at,
  g.updated_at
FROM geofences g
LEFT JOIN geofence_events ge ON g.id = ge.geofence_id
LEFT JOIN users u ON g.created_by = u.id
GROUP BY g.id, u.username, u.first_name, u.last_name;

COMMENT ON COLUMN geofences.created_by IS 'User ID of the user who created this geofence';
