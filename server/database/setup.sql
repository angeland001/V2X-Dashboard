-- PostGIS Setup for Kepler.gl
-- Run this file to set up your database

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create a simple spatial data table
CREATE TABLE IF NOT EXISTS spatial_data (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  location GEOMETRY(Point, 4326),  -- 4326 is WGS84 (standard lat/long)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index for faster queries
CREATE INDEX IF NOT EXISTS spatial_data_location_idx
  ON spatial_data USING GIST (location);

-- Insert some example data (Chattanooga area)
INSERT INTO spatial_data (name, location) VALUES
  ('Downtown', ST_SetSRID(ST_MakePoint(-85.3097, 35.0456), 4326)),
  ('UTC', ST_SetSRID(ST_MakePoint(-85.3066, 35.0456), 4326)),
  ('Coolidge Park', ST_SetSRID(ST_MakePoint(-85.3090, 35.0594), 4326)),
  ('Lookout Mountain', ST_SetSRID(ST_MakePoint(-85.3500, 34.9920), 4326));
