-- Geofencing Setup for Kepler.gl Integration
-- Run this after enabling PostGIS

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables if you want to start fresh 
-- DROP TABLE IF EXISTS geofence_events CASCADE;
-- DROP TABLE IF EXISTS geofence_alerts CASCADE;
-- DROP TABLE IF EXISTS geofence_intersections CASCADE;
-- DROP TABLE IF EXISTS geofence_kepler_configs CASCADE;
-- DROP TABLE IF EXISTS geofences CASCADE;

-- 1. Main Geofences Table
CREATE TABLE IF NOT EXISTS geofences (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  geometry GEOMETRY(Polygon, 4326) NOT NULL,
  geofence_type VARCHAR(50), -- 'intersection', 'corridor', 'zone', 'alert_area'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'archived'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for geofences
CREATE INDEX IF NOT EXISTS geofences_geometry_idx ON geofences USING GIST (geometry);
CREATE INDEX IF NOT EXISTS geofences_type_idx ON geofences (geofence_type);
CREATE INDEX IF NOT EXISTS geofences_status_idx ON geofences (status);

-- 2. Geofence Intersections (for V2X integration)
CREATE TABLE IF NOT EXISTS geofence_intersections (
  id SERIAL PRIMARY KEY,
  geofence_id INTEGER REFERENCES geofences(id) ON DELETE CASCADE,
  intersection_id VARCHAR(50) NOT NULL,
  approach_lanes JSONB DEFAULT '[]',
  signal_groups JSONB DEFAULT '[]',
  lidar_coverage_area GEOMETRY(Polygon, 4326),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geofence_intersections_geofence_idx ON geofence_intersections (geofence_id);
CREATE INDEX IF NOT EXISTS geofence_intersections_intersection_idx ON geofence_intersections (intersection_id);
CREATE INDEX IF NOT EXISTS geofence_intersections_lidar_idx ON geofence_intersections USING GIST (lidar_coverage_area);

-- 3. Geofence Events (object detection, entries, exits)
CREATE TABLE IF NOT EXISTS geofence_events (
  id SERIAL PRIMARY KEY,
  geofence_id INTEGER REFERENCES geofences(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'entry', 'exit', 'dwell', 'pedestrian_detected'
  object_id VARCHAR(100),
  object_type VARCHAR(50), -- 'vehicle', 'pedestrian', 'cyclist'
  event_location GEOMETRY(Point, 4326),
  event_time TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geofence_events_geofence_idx ON geofence_events (geofence_id);
CREATE INDEX IF NOT EXISTS geofence_events_time_idx ON geofence_events (event_time);
CREATE INDEX IF NOT EXISTS geofence_events_type_idx ON geofence_events (event_type);
CREATE INDEX IF NOT EXISTS geofence_events_location_idx ON geofence_events USING GIST (event_location);

-- 4. Geofence Alerts
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id SERIAL PRIMARY KEY,
  geofence_id INTEGER REFERENCES geofences(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  alert_message TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geofence_alerts_geofence_idx ON geofence_alerts (geofence_id);
CREATE INDEX IF NOT EXISTS geofence_alerts_active_idx ON geofence_alerts (active);
CREATE INDEX IF NOT EXISTS geofence_alerts_type_idx ON geofence_alerts (alert_type);

-- 5. Kepler.gl Configuration Storage
CREATE TABLE IF NOT EXISTS geofence_kepler_configs (
  id SERIAL PRIMARY KEY,
  geofence_id INTEGER REFERENCES geofences(id) ON DELETE CASCADE,
  layer_config JSONB NOT NULL DEFAULT '{}',
  filter_config JSONB DEFAULT '{}',
  interaction_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geofence_kepler_configs_geofence_idx ON geofence_kepler_configs (geofence_id);

-- Useful Views for API

-- View: Geofences with event statistics
CREATE OR REPLACE VIEW geofences_with_stats AS
SELECT 
  g.id,
  g.name,
  g.description,
  g.geofence_type,
  g.status,
  g.metadata,
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
GROUP BY g.id;

-- View: Active geofences with alerts
CREATE OR REPLACE VIEW geofences_with_active_alerts AS
SELECT 
  g.id,
  g.name,
  g.geofence_type,
  ST_AsGeoJSON(g.geometry)::jsonb as geometry_geojson,
  json_agg(
    json_build_object(
      'alert_id', ga.id,
      'alert_type', ga.alert_type,
      'severity', ga.severity,
      'message', ga.alert_message,
      'triggered_at', ga.triggered_at
    )
  ) FILTER (WHERE ga.id IS NOT NULL) as active_alerts
FROM geofences g
LEFT JOIN geofence_alerts ga ON g.id = ga.geofence_id AND ga.active = true
WHERE g.status = 'active'
GROUP BY g.id;

-- Function: Check if a point is inside any geofence
CREATE OR REPLACE FUNCTION check_point_in_geofences(
  point_lon DOUBLE PRECISION,
  point_lat DOUBLE PRECISION
)
RETURNS TABLE(
  geofence_id INTEGER,
  geofence_name VARCHAR,
  geofence_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.geofence_type
  FROM geofences g
  WHERE ST_Contains(
    g.geometry,
    ST_SetSRID(ST_MakePoint(point_lon, point_lat), 4326)
  )
  AND g.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function: Get geofences within a bounding box (for viewport queries)
CREATE OR REPLACE FUNCTION get_geofences_in_bbox(
  min_lon DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  max_lat DOUBLE PRECISION
)
RETURNS TABLE(
  id INTEGER,
  name VARCHAR,
  geofence_type VARCHAR,
  geometry_geojson JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.geofence_type,
    ST_AsGeoJSON(g.geometry)::jsonb
  FROM geofences g
  WHERE ST_Intersects(
    g.geometry,
    ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
  )
  AND g.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for MLK Smart Corridor (Chattanooga area)
INSERT INTO geofences (name, description, geometry, geofence_type, metadata) VALUES
(
  'MLK Smart Corridor - Main Zone',
  'Primary 1.25 mile corridor area from the research paper',
  ST_GeomFromText('POLYGON((-85.3120 35.0440, -85.3120 35.0480, -85.3050 35.0480, -85.3050 35.0440, -85.3120 35.0440))', 4326),
  'corridor',
  '{"color": "#FF5733", "opacity": 0.4}'::jsonb
),
(
  'MLK & 4th Street Intersection',
  'Signalized intersection with LiDAR coverage',
  ST_GeomFromText('POLYGON((-85.3097 35.0450, -85.3097 35.0462, -85.3085 35.0462, -85.3085 35.0450, -85.3097 35.0450))', 4326),
  'intersection',
  '{"intersection_id": "INT001", "has_lidar": true, "detection_radius": 150}'::jsonb
),
(
  'Pedestrian Crossing Alert Zone - Downtown',
  'High-traffic pedestrian area requiring alerts',
  ST_GeomFromText('POLYGON((-85.3090 35.0456, -85.3090 35.0460, -85.3086 35.0460, -85.3086 35.0456, -85.3090 35.0456))', 4326),
  'alert_area',
  '{"alert_type": "pedestrian_crossing", "priority": "high"}'::jsonb
);

-- Add corresponding intersection data
INSERT INTO geofence_intersections (geofence_id, intersection_id, lidar_coverage_area) VALUES
(
  2, -- MLK & 4th Street
  'INT001',
  ST_Buffer(ST_GeomFromText('POINT(-85.3091 35.0456)', 4326)::geography, 150)::geometry
);

COMMENT ON TABLE geofences IS 'Main table storing geofence polygons for Kepler.gl visualization';
COMMENT ON TABLE geofence_events IS 'Event log for objects entering/exiting geofences (SDSM integration)';
COMMENT ON TABLE geofence_alerts IS 'Alert rules and triggers for TIM messages';
COMMENT ON TABLE geofence_intersections IS 'Links geofences to V2X intersection infrastructure';
