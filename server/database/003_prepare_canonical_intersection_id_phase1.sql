-- Phase 1 prep for canonical user-entered intersection_id
-- 1. Reset intersection-related dev data
-- 2. Enforce unique canonical intersection_id

BEGIN;

TRUNCATE TABLE intersections RESTART IDENTITY CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intersections_intersection_id_unique
    ON intersections(intersection_id);

COMMIT;
