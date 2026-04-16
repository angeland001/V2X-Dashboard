-- Phase 5: remove temporary dual-ID child-table compatibility layer
-- Preserves data while collapsing child tables to one canonical intersection_id

BEGIN;

DROP TRIGGER IF EXISTS trg_lanes_sync_intersection_identity ON lanes;
DROP TRIGGER IF EXISTS trg_crosswalks_sync_intersection_identity ON crosswalks;
DROP TRIGGER IF EXISTS trg_map_data_exports_sync_intersection_identity ON map_data_exports;
DROP TRIGGER IF EXISTS trg_spat_zones_sync_intersection_identity ON spat_zones;
DROP TRIGGER IF EXISTS trg_preemption_zones_sync_intersection_identity ON preemption_zones;
DROP TRIGGER IF EXISTS trg_preemption_zone_configs_sync_intersection_identity ON preemption_zone_configs;

DROP FUNCTION IF EXISTS public.sync_child_intersection_identity();

ALTER TABLE lanes DROP COLUMN IF EXISTS intersection_id;
ALTER TABLE crosswalks DROP COLUMN IF EXISTS intersection_id;
ALTER TABLE map_data_exports DROP COLUMN IF EXISTS intersection_id;
ALTER TABLE spat_zones DROP COLUMN IF EXISTS intersection_id;
ALTER TABLE preemption_zones DROP COLUMN IF EXISTS intersection_id;
ALTER TABLE preemption_zone_configs DROP CONSTRAINT IF EXISTS preemption_zone_configs_intersection_unique;
ALTER TABLE preemption_zone_configs DROP COLUMN IF EXISTS intersection_id;

ALTER TABLE lanes RENAME COLUMN canonical_intersection_id TO intersection_id;
ALTER TABLE crosswalks RENAME COLUMN canonical_intersection_id TO intersection_id;
ALTER TABLE map_data_exports RENAME COLUMN canonical_intersection_id TO intersection_id;
ALTER TABLE spat_zones RENAME COLUMN canonical_intersection_id TO intersection_id;
ALTER TABLE preemption_zones RENAME COLUMN canonical_intersection_id TO intersection_id;
ALTER TABLE preemption_zone_configs RENAME COLUMN canonical_intersection_id TO intersection_id;

ALTER TABLE preemption_zone_configs
    ADD CONSTRAINT preemption_zone_configs_intersection_unique UNIQUE (intersection_id);

DROP INDEX IF EXISTS idx_lanes_canonical_intersection;
DROP INDEX IF EXISTS idx_crosswalks_canonical_intersection;
DROP INDEX IF EXISTS idx_map_data_exports_canonical_intersection;
DROP INDEX IF EXISTS idx_spat_zones_canonical_intersection;
DROP INDEX IF EXISTS idx_preemption_zones_canonical_intersection;
DROP INDEX IF EXISTS idx_preemption_zone_configs_canonical_intersection;

CREATE INDEX IF NOT EXISTS idx_lanes_intersection ON lanes(intersection_id);
CREATE INDEX IF NOT EXISTS idx_crosswalks_intersection ON crosswalks(intersection_id);
CREATE INDEX IF NOT EXISTS idx_map_data_exports_intersection ON map_data_exports(intersection_id);
CREATE INDEX IF NOT EXISTS idx_spat_zones_intersection ON spat_zones(intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_intersection ON preemption_zones(intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_intersection ON preemption_zone_configs(intersection_id);

COMMIT;
