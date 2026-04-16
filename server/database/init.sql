-- ============================================================
-- Prism Dashboard - Full Database Initialization
-- Run this file once to set up the entire database schema.
--
-- Prerequisites: PostgreSQL with PostGIS extension installed.
-- Usage:  psql -U postgres -d kepler_db -f init.sql
-- ============================================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS public;

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.users (
  id              integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
  username        character varying(50) NOT NULL,
  password_hash   character varying(255) NOT NULL,
  created_at      timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_login      timestamp with time zone,
  first_name      character varying(100) NOT NULL,
  last_name       character varying(100) NOT NULL,
  email           character varying(255) NOT NULL,
  date_of_birth   date,
  role            character varying(50) DEFAULT 'user',
  profile_picture character varying(500),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_username_key UNIQUE (username),
  CONSTRAINT users_email_key UNIQUE (email)
);

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS users_profile_picture_idx ON public.users USING btree (id)
  WHERE (profile_picture IS NOT NULL);

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. INTERSECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS intersections (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    ref_point           GEOMETRY(Point, 4326) NOT NULL,
    region_id           INTEGER DEFAULT 0,
    intersection_id     INTEGER NOT NULL,
    msg_issue_revision  INTEGER DEFAULT 1,
    status              VARCHAR(20) DEFAULT 'draft',
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intersections_status ON intersections(status);
CREATE INDEX IF NOT EXISTS idx_intersections_ref_point ON intersections USING GIST(ref_point);
CREATE UNIQUE INDEX IF NOT EXISTS idx_intersections_intersection_id_unique ON intersections(intersection_id);

-- ============================================================
-- 3. LANES
-- ============================================================
CREATE TABLE IF NOT EXISTS lanes (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    geometry        GEOMETRY(LineString, 4326) NOT NULL,
    lane_type       VARCHAR(50) NOT NULL DEFAULT 'Vehicle',
    phase           INTEGER,
    name            VARCHAR(255),
    lane_number     INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lanes_intersection ON lanes(intersection_id);
CREATE INDEX IF NOT EXISTS idx_lanes_geometry ON lanes USING GIST(geometry);

-- ============================================================
-- 4. CROSSWALKS
-- ============================================================
CREATE TABLE IF NOT EXISTS crosswalks (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    geometry        GEOMETRY(Polygon, 4326) NOT NULL,
    approach_type   VARCHAR(50) NOT NULL DEFAULT 'Both',
    approach_id     INTEGER,
    name            VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crosswalks_intersection ON crosswalks(intersection_id);
CREATE INDEX IF NOT EXISTS idx_crosswalks_geometry ON crosswalks USING GIST(geometry);

-- ============================================================
-- 5. MAP DATA EXPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS map_data_exports (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    map_data_json   JSONB NOT NULL,
    revision        INTEGER NOT NULL DEFAULT 1,
    exported_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_data_exports_intersection ON map_data_exports(intersection_id);

-- ============================================================
-- 6. LANE CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS lane_connections (
    id            SERIAL PRIMARY KEY,
    from_lane_id  INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    to_lane_id    INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    signal_group  INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lane_connections_from ON lane_connections(from_lane_id);
CREATE INDEX IF NOT EXISTS idx_lane_connections_to ON lane_connections(to_lane_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lane_connections_unique ON lane_connections(from_lane_id, to_lane_id);

-- ============================================================
-- 6. SPaT ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS spat_zones (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    lane_ids        INTEGER[] NOT NULL,
    signal_group    INTEGER NOT NULL,
    polygon         GEOMETRY(Polygon, 4326) NOT NULL,
    entry_line      GEOMETRY(LineString, 4326) NOT NULL,
    exit_line       GEOMETRY(LineString, 4326) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spat_zones_intersection ON spat_zones(intersection_id);
CREATE INDEX IF NOT EXISTS idx_spat_zones_polygon ON spat_zones USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_spat_zones_entry_line ON spat_zones USING GIST(entry_line);
CREATE INDEX IF NOT EXISTS idx_spat_zones_exit_line ON spat_zones USING GIST(exit_line);

DROP TRIGGER IF EXISTS trg_spat_zones_updated ON spat_zones;
CREATE TRIGGER trg_spat_zones_updated
    BEFORE UPDATE ON spat_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. PREEMPTION ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS preemption_zones (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    controller_ip   VARCHAR(255),
    lane_ids        INTEGER[] NOT NULL,
    signal_group    INTEGER NOT NULL,
    polygon         GEOMETRY(Polygon, 4326) NOT NULL,
    entry_line      GEOMETRY(LineString, 4326) NOT NULL,
    exit_line       GEOMETRY(LineString, 4326) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preemption_zones_intersection ON preemption_zones(intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_polygon ON preemption_zones USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_entry_line ON preemption_zones USING GIST(entry_line);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_exit_line ON preemption_zones USING GIST(exit_line);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_controller_ip ON preemption_zones(controller_ip);

DROP TRIGGER IF EXISTS trg_preemption_zones_updated ON preemption_zones;
CREATE TRIGGER trg_preemption_zones_updated
    BEFORE UPDATE ON preemption_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. PREEMPTION ZONE CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS preemption_zone_configs (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    spat_zone_id    INTEGER NOT NULL REFERENCES spat_zones(id) ON DELETE CASCADE,
    controller_ip   VARCHAR(255),
    lane_ids        INTEGER[] NOT NULL,
    signal_group    INTEGER NOT NULL,
    polygon         GEOMETRY(Polygon, 4326),
    entry_line      GEOMETRY(LineString, 4326),
    exit_line       GEOMETRY(LineString, 4326),
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT preemption_zone_configs_intersection_unique UNIQUE (intersection_id, name)
);

CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_intersection
    ON preemption_zone_configs(intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_name
    ON preemption_zone_configs(name);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_spat_zone
    ON preemption_zone_configs(spat_zone_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_controller_ip
    ON preemption_zone_configs(controller_ip);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_polygon
    ON preemption_zone_configs USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_entry_line
    ON preemption_zone_configs USING GIST(entry_line);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_exit_line
    ON preemption_zone_configs USING GIST(exit_line);

DROP TRIGGER IF EXISTS trg_preemption_zone_configs_updated ON preemption_zone_configs;
CREATE TRIGGER trg_preemption_zone_configs_updated
    BEFORE UPDATE ON preemption_zone_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_intersections_updated ON intersections;
CREATE TRIGGER trg_intersections_updated
    BEFORE UPDATE ON intersections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lanes_updated ON lanes;
CREATE TRIGGER trg_lanes_updated
    BEFORE UPDATE ON lanes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crosswalks_updated ON crosswalks;
CREATE TRIGGER trg_crosswalks_updated
    BEFORE UPDATE ON crosswalks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. SDSM EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sdsm_events (
    id                SERIAL PRIMARY KEY,
    intersection_id   VARCHAR(50) NOT NULL,
    intersection_name VARCHAR(100) NOT NULL,
    object_id         INTEGER NOT NULL,
    object_type       VARCHAR(20) NOT NULL CHECK (object_type IN ('vehicle', 'vru')),
    timestamp         TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location          GEOMETRY(Point, 4326) NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL,
    heading           INTEGER,
    speed             INTEGER,
    size_width        INTEGER,
    size_length       INTEGER,
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate events: same intersection + object + timestamp = same event
CREATE UNIQUE INDEX IF NOT EXISTS sdsm_events_unique_event_idx
  ON public.sdsm_events (intersection_name, object_id, timestamp);

CREATE INDEX IF NOT EXISTS sdsm_events_intersection_id_idx ON public.sdsm_events USING btree (intersection_id);
CREATE INDEX IF NOT EXISTS sdsm_events_timestamp_idx ON public.sdsm_events USING btree (timestamp);
CREATE INDEX IF NOT EXISTS sdsm_events_object_type_idx ON public.sdsm_events USING btree (object_type);
CREATE INDEX IF NOT EXISTS sdsm_events_location_idx ON public.sdsm_events USING gist (location);
CREATE INDEX IF NOT EXISTS sdsm_events_created_at_idx ON public.sdsm_events USING btree (created_at);
CREATE INDEX IF NOT EXISTS sdsm_events_intersection_timestamp_idx ON public.sdsm_events USING btree (intersection_id, timestamp DESC);

-- Analytics view
CREATE OR REPLACE VIEW public.sdsm_events_analytics AS
SELECT
    intersection_id,
    intersection_name,
    object_type,
    DATE_TRUNC('hour', timestamp) AS hour,
    COUNT(*) AS event_count,
    COUNT(DISTINCT object_id) AS unique_objects,
    AVG(speed) FILTER (WHERE speed < 8191) AS avg_speed,
    MIN(timestamp) AS first_seen,
    MAX(timestamp) AS last_seen
FROM public.sdsm_events
GROUP BY intersection_id, intersection_name, object_type, DATE_TRUNC('hour', timestamp);

-- Recent events view
CREATE OR REPLACE VIEW public.sdsm_events_recent AS
SELECT *
FROM public.sdsm_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_sdsm_events(retention_days INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.sdsm_events
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
