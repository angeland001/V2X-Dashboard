-- ============================================================
-- Migration 013: Allow multiple cameras per intersection
--
-- Drops the UNIQUE constraint that limited each intersection
-- to exactly one camera. The IP uniqueness constraint is kept
-- (two cameras cannot share the same IP address).
-- ============================================================

ALTER TABLE cameras
  DROP CONSTRAINT IF EXISTS cameras_intersection_unique;

COMMENT ON TABLE cameras IS
  'Axis IP camera registry. One intersection may have multiple cameras (e.g. 4-way view).
   Credentials (username/password) are loaded from env vars CAMERA_USERNAME / CAMERA_PASSWORD
   and are never stored here.';
