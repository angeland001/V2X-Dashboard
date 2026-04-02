-- V2X MapData Schema
-- Creates tables for intersections, lanes, crosswalks, and MapData exports
-- 

-- Enable PostGIS if not already
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. INTERSECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS intersections (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    -- SAE J2735 intersection reference point (lon/lat)
    ref_point       GEOMETRY(Point, 4326) NOT NULL,
    -- SAE J2735 region / intersection ID
    region_id       INTEGER DEFAULT 0,
    intersection_id INTEGER NOT NULL,
    -- revision counter bumped on each confirm / export
    msg_issue_revision INTEGER DEFAULT 1,
    -- status: draft | confirmed
    status          VARCHAR(20) DEFAULT 'draft',
    -- who created it
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intersections_status ON intersections(status);
CREATE INDEX IF NOT EXISTS idx_intersections_ref_point ON intersections USING GIST(ref_point);

-- ============================================================
-- 2. LANES
-- ============================================================
CREATE TABLE IF NOT EXISTS lanes (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    -- polyline centerline
    geometry        GEOMETRY(LineString, 4326) NOT NULL,
    -- Vehicle | Crosswalk | Bike | Sidewalk | Parking
    lane_type       VARCHAR(50) NOT NULL DEFAULT 'Vehicle',
    -- signal phase integer
    phase           INTEGER,
    -- optional display name
    name            VARCHAR(255),
    -- SAE J2735 lane ID within the intersection (1-255)
    lane_number     INTEGER,
    -- extra metadata (JSON)
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lanes_intersection ON lanes(intersection_id);
CREATE INDEX IF NOT EXISTS idx_lanes_geometry ON lanes USING GIST(geometry);

-- ============================================================
-- 3. CROSSWALKS
-- ============================================================
CREATE TABLE IF NOT EXISTS crosswalks (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    -- bounding polygon
    geometry        GEOMETRY(Polygon, 4326) NOT NULL,
    -- Ingress | Egress | Both | None
    approach_type   VARCHAR(50) NOT NULL DEFAULT 'Both',
    -- approach id integer
    approach_id     INTEGER,
    -- optional display name
    name            VARCHAR(255),
    -- extra metadata (JSON)
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crosswalks_intersection ON crosswalks(intersection_id);
CREATE INDEX IF NOT EXISTS idx_crosswalks_geometry ON crosswalks USING GIST(geometry);

-- ============================================================
-- 4. MAP DATA EXPORTS  (cached JSON per intersection)
-- ============================================================
CREATE TABLE IF NOT EXISTS map_data_exports (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    -- full SAE J2735 MapData-like JSON blob
    map_data_json   JSONB NOT NULL,
    revision        INTEGER NOT NULL DEFAULT 1,
    exported_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_data_exports_intersection ON map_data_exports(intersection_id);

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to each table
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
-- 5. LANE CONNECTIONS  (ingress → egress links)
-- ============================================================
CREATE TABLE IF NOT EXISTS lane_connections (
    id              SERIAL PRIMARY KEY,
    from_lane_id    INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    to_lane_id      INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    signal_group    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lane_connections_from ON lane_connections(from_lane_id);
CREATE INDEX IF NOT EXISTS idx_lane_connections_to ON lane_connections(to_lane_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lane_connections_unique ON lane_connections(from_lane_id, to_lane_id);

-- ============================================================
-- 6. SPaT ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS spat_zones (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
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
-- 7. PREEMPTION ZONE CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS preemption_zone_configs (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    spat_zone_id    INTEGER NOT NULL REFERENCES spat_zones(id) ON DELETE CASCADE,
    controller_ip   VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT preemption_zone_configs_intersection_unique UNIQUE (intersection_id)
);

CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_intersection
    ON preemption_zone_configs(intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_spat_zone
    ON preemption_zone_configs(spat_zone_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_controller_ip
    ON preemption_zone_configs(controller_ip);

DROP TRIGGER IF EXISTS trg_preemption_zone_configs_updated ON preemption_zone_configs;
CREATE TRIGGER trg_preemption_zone_configs_updated
    BEFORE UPDATE ON preemption_zone_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
