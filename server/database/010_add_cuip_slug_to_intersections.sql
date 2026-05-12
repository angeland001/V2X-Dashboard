-- ============================================================
-- Migration 010: Add cuip_slug to intersections
--
-- Adds a nullable, unique string column to intersections that
-- holds the CUIP stream identifier (e.g. "MLK_Georgia").
-- This is the key that links live SPaT / SDSM / lidar stream
-- events — which identify intersections by this slug — to the
-- DB intersection row and its linked controller_adapter.
--
-- Known slugs from the MLK Smart Corridor stream:
--   MLK_Broad, MLK_Central, MLK_Chestnut, MLK_Douglas,
--   MLK_Georgia, MLK_Houston, MLK_Lindsay, MLK_Magnolia,
--   MLK_Market, MLK_Peeples, MLK_Pine
--
-- To assign a slug after adding an intersection:
--   UPDATE intersections SET cuip_slug = 'MLK_Georgia'
--   WHERE intersection_id = <your_id>;
-- ============================================================

ALTER TABLE intersections
  ADD COLUMN IF NOT EXISTS cuip_slug VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intersections_cuip_slug
  ON intersections(cuip_slug)
  WHERE cuip_slug IS NOT NULL;

COMMENT ON COLUMN intersections.cuip_slug IS
  'CUIP stream identifier (e.g. MLK_Georgia). Links SPaT/SDSM events to this intersection row.';
