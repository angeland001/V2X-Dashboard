-- Create the geofences table
CREATE TABLE IF NOT EXISTS public.geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    geofence_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by INTEGER
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS geofences_geometry_idx ON public.geofences USING gist (geometry);
CREATE INDEX IF NOT EXISTS geofences_type_idx ON public.geofences USING btree (geofence_type);
CREATE INDEX IF NOT EXISTS geofences_status_idx ON public.geofences USING btree (status);
CREATE INDEX IF NOT EXISTS geofences_created_by_idx ON public.geofences USING btree (created_by);

-- Add foreign key constraint to users table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.geofences
        ADD CONSTRAINT geofences_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create helper function for checking if a point is inside any geofence
CREATE OR REPLACE FUNCTION public.check_point_in_geofences(point_lon DOUBLE PRECISION, point_lat DOUBLE PRECISION)
RETURNS TABLE(geofence_id INTEGER, geofence_name VARCHAR, geofence_type VARCHAR)
LANGUAGE plpgsql
AS $$
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
$$;

-- Create helper function for getting geofences in a bounding box
CREATE OR REPLACE FUNCTION public.get_geofences_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION
)
RETURNS TABLE(id INTEGER, name VARCHAR, geofence_type VARCHAR, geometry_geojson JSONB)
LANGUAGE plpgsql
AS $$
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
$$;

-- Add table comment
COMMENT ON TABLE public.geofences IS 'Main table storing geofence polygons for Kepler.gl visualization';
