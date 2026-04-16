-- Migration: Create independent preemption_zones table
-- Purpose: Support multiple preemption zones per intersection without relying on SPaT zone references

CREATE TABLE IF NOT EXISTS preemption_zones (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_preemption_zones_intersection
    ON preemption_zones(intersection_id);

CREATE INDEX IF NOT EXISTS idx_preemption_zones_polygon
    ON preemption_zones USING GIST(polygon);

CREATE INDEX IF NOT EXISTS idx_preemption_zones_entry_line
    ON preemption_zones USING GIST(entry_line);

CREATE INDEX IF NOT EXISTS idx_preemption_zones_exit_line
    ON preemption_zones USING GIST(exit_line);

CREATE INDEX IF NOT EXISTS idx_preemption_zones_controller_ip
    ON preemption_zones(controller_ip);

DROP TRIGGER IF EXISTS trg_preemption_zones_updated ON preemption_zones;
CREATE TRIGGER trg_preemption_zones_updated
    BEFORE UPDATE ON preemption_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
