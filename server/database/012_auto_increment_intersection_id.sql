-- ============================================================
-- Migration 012: Auto-increment intersection_id
--
-- Creates a sequence for intersection_id so the backend
-- automatically assigns IDs instead of requiring user input.
-- Existing intersections keep their current IDs.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS intersections_intersection_id_seq
    AS INTEGER
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647;

-- Set the next value to be higher than any existing ID
DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT MAX(intersection_id) INTO max_id FROM intersections;
  IF max_id IS NOT NULL THEN
    PERFORM setval('intersections_intersection_id_seq', max_id + 1);
  END IF;
END $$;

-- Alter the column to use the sequence as default
ALTER TABLE intersections
  ALTER COLUMN intersection_id SET DEFAULT nextval('intersections_intersection_id_seq');

COMMENT ON SEQUENCE intersections_intersection_id_seq IS
  'Auto-incrementing sequence for J2735 intersection IDs. Starts at 1000 to avoid conflicts with existing hardcoded IDs.';
