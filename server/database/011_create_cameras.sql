-- ============================================================
-- Migration 011: Axis IP Camera Registry
--
-- Creates the cameras table to store Axis IP camera connection
-- details per intersection. Credentials are stored server-side
-- only (username/password from env vars, NOT in this table).
--
-- Linked to intersections via intersection_id (the canonical
-- J2735 integer key, same FK as controller_adapters).
--
-- stream_path:  VAPIX MJPEG path, default /axis-cgi/mjpg/video.cgi
-- rtsp_path:    RTSP path for future VSS/HLS use
-- label:        Human-readable name (from Excel, e.g. "MLK & Georgia")
-- ============================================================

CREATE TABLE IF NOT EXISTS cameras (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL
        REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    label           VARCHAR(255) NOT NULL,  -- human name, e.g. "MLK & Georgia Intersection"
    ip_address      VARCHAR(255) NOT NULL,
    -- VAPIX MJPEG endpoint path
    stream_path     VARCHAR(255) NOT NULL DEFAULT '/axis-cgi/mjpg/video.cgi',
    -- Optional RTSP path for future HLS/VSS integration
    rtsp_path       VARCHAR(255) DEFAULT '/axis-media/media.amp',
    -- active | offline | maintenance
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cameras_ip_unique UNIQUE (ip_address),
    CONSTRAINT cameras_intersection_unique UNIQUE (intersection_id)
);

CREATE INDEX IF NOT EXISTS idx_cameras_intersection_id
    ON cameras(intersection_id);

DROP TRIGGER IF EXISTS trg_cameras_updated ON cameras;
CREATE TRIGGER trg_cameras_updated
    BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cameras IS
  'Axis IP camera registry. Credentials (username/password) are loaded from
   env vars CAMERA_USERNAME / CAMERA_PASSWORD and are never stored here.';
COMMENT ON COLUMN cameras.intersection_id IS
  'Links to intersections.intersection_id (J2735 canonical ID).';
COMMENT ON COLUMN cameras.stream_path IS
  'VAPIX MJPEG HTTP path, appended to http://<ip_address><stream_path>';
COMMENT ON COLUMN cameras.rtsp_path IS
  'RTSP path for future FFmpeg/HLS or NVIDIA VSS ingestion.';
