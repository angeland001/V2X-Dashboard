-- Phase 6A: evolve preemption_zone_configs into the future multi-zone table
-- Keep the current legacy UI working by reserving the __legacy__ row name.

BEGIN;

ALTER TABLE preemption_zone_configs
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS polygon GEOMETRY(Polygon, 4326),
    ADD COLUMN IF NOT EXISTS entry_line GEOMETRY(LineString, 4326),
    ADD COLUMN IF NOT EXISTS exit_line GEOMETRY(LineString, 4326),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

UPDATE preemption_zone_configs
   SET name = '__legacy__'
 WHERE name IS NULL;

UPDATE preemption_zone_configs c
   SET polygon = s.polygon,
       entry_line = s.entry_line,
       exit_line = s.exit_line,
       status = COALESCE(c.status, 'active')
  FROM spat_zones s
 WHERE c.spat_zone_id = s.id
   AND (
        c.polygon IS NULL OR
        c.entry_line IS NULL OR
        c.exit_line IS NULL OR
        c.status IS NULL
   );

ALTER TABLE preemption_zone_configs
    ALTER COLUMN name SET DEFAULT '__legacy__',
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE preemption_zone_configs
    DROP CONSTRAINT IF EXISTS preemption_zone_configs_intersection_unique;

ALTER TABLE preemption_zone_configs
    ADD CONSTRAINT preemption_zone_configs_intersection_unique UNIQUE (intersection_id, name);

CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_name
    ON preemption_zone_configs(name);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_polygon
    ON preemption_zone_configs USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_entry_line
    ON preemption_zone_configs USING GIST(entry_line);
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_exit_line
    ON preemption_zone_configs USING GIST(exit_line);

COMMIT;
