BEGIN;

DELETE FROM preemption_zone_configs
WHERE name = '__legacy__';

ALTER TABLE preemption_zone_configs
    ALTER COLUMN name DROP DEFAULT;

COMMIT;
