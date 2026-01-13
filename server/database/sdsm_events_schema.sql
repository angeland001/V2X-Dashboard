--
-- SDSM (Sensor Data Sharing Message) Events Schema
-- Stores real-time vehicle and VRU (Vulnerable Road User) tracking data
--

-- Create SDSM events table for long-term storage and analytics
CREATE TABLE IF NOT EXISTS public.sdsm_events (
    id SERIAL PRIMARY KEY,
    intersection_id VARCHAR(50) NOT NULL,
    intersection_name VARCHAR(100) NOT NULL,
    object_id INTEGER NOT NULL,
    object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('vehicle', 'vru')),
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    heading INTEGER,
    speed INTEGER,
    size_width INTEGER,
    size_length INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS sdsm_events_intersection_id_idx ON public.sdsm_events USING btree (intersection_id);
CREATE INDEX IF NOT EXISTS sdsm_events_timestamp_idx ON public.sdsm_events USING btree (timestamp);
CREATE INDEX IF NOT EXISTS sdsm_events_object_type_idx ON public.sdsm_events USING btree (object_type);
CREATE INDEX IF NOT EXISTS sdsm_events_location_idx ON public.sdsm_events USING gist (location);
CREATE INDEX IF NOT EXISTS sdsm_events_created_at_idx ON public.sdsm_events USING btree (created_at);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS sdsm_events_intersection_timestamp_idx ON public.sdsm_events USING btree (intersection_id, timestamp DESC);

-- Add table comments
COMMENT ON TABLE public.sdsm_events IS 'Stores SDSM (Sensor Data Sharing Message) events for vehicle and VRU tracking at intersections';
COMMENT ON COLUMN public.sdsm_events.object_type IS 'Type of detected object: vehicle or vru (Vulnerable Road User)';
COMMENT ON COLUMN public.sdsm_events.heading IS 'Heading in hundredths of degrees (0-35999)';
COMMENT ON COLUMN public.sdsm_events.speed IS 'Speed in units defined by the API';

-- Create view for analytics with aggregated data
CREATE OR REPLACE VIEW public.sdsm_events_analytics AS
SELECT
    intersection_id,
    intersection_name,
    object_type,
    DATE_TRUNC('hour', timestamp) AS hour,
    COUNT(*) AS event_count,
    COUNT(DISTINCT object_id) AS unique_objects,
    AVG(speed) FILTER (WHERE speed < 8191) AS avg_speed,
    MIN(timestamp) AS first_seen,
    MAX(timestamp) AS last_seen
FROM public.sdsm_events
GROUP BY intersection_id, intersection_name, object_type, DATE_TRUNC('hour', timestamp);

-- Create view for recent events (last 24 hours)
CREATE OR REPLACE VIEW public.sdsm_events_recent AS
SELECT *
FROM public.sdsm_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Function to clean up old data (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_sdsm_events(retention_days INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.sdsm_events
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_old_sdsm_events IS 'Deletes SDSM events older than specified retention period (default 180 days)';
