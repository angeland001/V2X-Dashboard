-- Phase 2: add canonical child intersection IDs without breaking the current app
-- Keeps existing child intersection_id columns (DB FK to intersections.id)
-- Adds canonical_intersection_id columns (FK to intersections.intersection_id)
-- Sync triggers allow old and new code paths to coexist during the migration

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intersections_intersection_id_unique
    ON intersections(intersection_id);

CREATE OR REPLACE FUNCTION public.sync_child_intersection_identity()
RETURNS TRIGGER AS $$
DECLARE
    resolved_db_id INTEGER;
    resolved_canonical_id INTEGER;
BEGIN
    IF NEW.intersection_id IS NULL AND NEW.canonical_intersection_id IS NULL THEN
        RAISE EXCEPTION 'Either intersection_id or canonical_intersection_id must be provided';
    END IF;

    IF NEW.intersection_id IS NOT NULL THEN
        SELECT intersection_id
          INTO resolved_canonical_id
          FROM intersections
         WHERE id = NEW.intersection_id;

        IF resolved_canonical_id IS NULL THEN
            RAISE EXCEPTION 'No intersection found for internal id %', NEW.intersection_id;
        END IF;
    END IF;

    IF NEW.canonical_intersection_id IS NOT NULL THEN
        SELECT id
          INTO resolved_db_id
          FROM intersections
         WHERE intersection_id = NEW.canonical_intersection_id;

        IF resolved_db_id IS NULL THEN
            RAISE EXCEPTION 'No intersection found for canonical id %', NEW.canonical_intersection_id;
        END IF;
    END IF;

    IF NEW.intersection_id IS NULL THEN
        NEW.intersection_id = resolved_db_id;
    ELSIF NEW.canonical_intersection_id IS NULL THEN
        NEW.canonical_intersection_id = resolved_canonical_id;
    ELSIF resolved_db_id <> NEW.intersection_id OR resolved_canonical_id <> NEW.canonical_intersection_id THEN
        RAISE EXCEPTION
            'intersection_id % and canonical_intersection_id % do not refer to the same intersection',
            NEW.intersection_id,
            NEW.canonical_intersection_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE lanes ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;
ALTER TABLE crosswalks ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;
ALTER TABLE map_data_exports ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;
ALTER TABLE spat_zones ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;
ALTER TABLE preemption_zones ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;
ALTER TABLE preemption_zone_configs ADD COLUMN IF NOT EXISTS canonical_intersection_id INTEGER;

UPDATE lanes l
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE l.intersection_id = i.id
   AND (l.canonical_intersection_id IS NULL OR l.canonical_intersection_id <> i.intersection_id);

UPDATE crosswalks c
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE c.intersection_id = i.id
   AND (c.canonical_intersection_id IS NULL OR c.canonical_intersection_id <> i.intersection_id);

UPDATE map_data_exports m
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE m.intersection_id = i.id
   AND (m.canonical_intersection_id IS NULL OR m.canonical_intersection_id <> i.intersection_id);

UPDATE spat_zones s
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE s.intersection_id = i.id
   AND (s.canonical_intersection_id IS NULL OR s.canonical_intersection_id <> i.intersection_id);

UPDATE preemption_zones p
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE p.intersection_id = i.id
   AND (p.canonical_intersection_id IS NULL OR p.canonical_intersection_id <> i.intersection_id);

UPDATE preemption_zone_configs pc
   SET canonical_intersection_id = i.intersection_id
  FROM intersections i
 WHERE pc.intersection_id = i.id
   AND (pc.canonical_intersection_id IS NULL OR pc.canonical_intersection_id <> i.intersection_id);

ALTER TABLE lanes ALTER COLUMN canonical_intersection_id SET NOT NULL;
ALTER TABLE crosswalks ALTER COLUMN canonical_intersection_id SET NOT NULL;
ALTER TABLE map_data_exports ALTER COLUMN canonical_intersection_id SET NOT NULL;
ALTER TABLE spat_zones ALTER COLUMN canonical_intersection_id SET NOT NULL;
ALTER TABLE preemption_zones ALTER COLUMN canonical_intersection_id SET NOT NULL;
ALTER TABLE preemption_zone_configs ALTER COLUMN canonical_intersection_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lanes_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE lanes
            ADD CONSTRAINT lanes_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'crosswalks_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE crosswalks
            ADD CONSTRAINT crosswalks_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'map_data_exports_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE map_data_exports
            ADD CONSTRAINT map_data_exports_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'spat_zones_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE spat_zones
            ADD CONSTRAINT spat_zones_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'preemption_zones_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE preemption_zones
            ADD CONSTRAINT preemption_zones_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'preemption_zone_configs_canonical_intersection_id_fkey'
    ) THEN
        ALTER TABLE preemption_zone_configs
            ADD CONSTRAINT preemption_zone_configs_canonical_intersection_id_fkey
            FOREIGN KEY (canonical_intersection_id)
            REFERENCES intersections(intersection_id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lanes_canonical_intersection
    ON lanes(canonical_intersection_id);
CREATE INDEX IF NOT EXISTS idx_crosswalks_canonical_intersection
    ON crosswalks(canonical_intersection_id);
CREATE INDEX IF NOT EXISTS idx_map_data_exports_canonical_intersection
    ON map_data_exports(canonical_intersection_id);
CREATE INDEX IF NOT EXISTS idx_spat_zones_canonical_intersection
    ON spat_zones(canonical_intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zones_canonical_intersection
    ON preemption_zones(canonical_intersection_id);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_canonical_intersection
    ON preemption_zone_configs(canonical_intersection_id);

DROP TRIGGER IF EXISTS trg_lanes_sync_intersection_identity ON lanes;
CREATE TRIGGER trg_lanes_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON lanes
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

DROP TRIGGER IF EXISTS trg_crosswalks_sync_intersection_identity ON crosswalks;
CREATE TRIGGER trg_crosswalks_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON crosswalks
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

DROP TRIGGER IF EXISTS trg_map_data_exports_sync_intersection_identity ON map_data_exports;
CREATE TRIGGER trg_map_data_exports_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON map_data_exports
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

DROP TRIGGER IF EXISTS trg_spat_zones_sync_intersection_identity ON spat_zones;
CREATE TRIGGER trg_spat_zones_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON spat_zones
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

DROP TRIGGER IF EXISTS trg_preemption_zones_sync_intersection_identity ON preemption_zones;
CREATE TRIGGER trg_preemption_zones_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON preemption_zones
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

DROP TRIGGER IF EXISTS trg_preemption_zone_configs_sync_intersection_identity ON preemption_zone_configs;
CREATE TRIGGER trg_preemption_zone_configs_sync_intersection_identity
    BEFORE INSERT OR UPDATE OF intersection_id, canonical_intersection_id ON preemption_zone_configs
    FOR EACH ROW EXECUTE FUNCTION public.sync_child_intersection_identity();

COMMIT;
