-- VSS Events table: stores events ingested from the NVIDIA Video Search and Summarization API.
-- Run this migration before starting the server with the VSS poller enabled.

CREATE TABLE IF NOT EXISTS vss_events (
    id            SERIAL PRIMARY KEY,
    camera_id     VARCHAR(100)    NOT NULL,
    stream_name   VARCHAR(200),
    event_type    VARCHAR(100)    NOT NULL,
    timestamp     TIMESTAMPTZ     NOT NULL,
    location      GEOMETRY(Point, 4326),
    longitude     DOUBLE PRECISION,
    latitude      DOUBLE PRECISION,
    description   TEXT,
    confidence    DOUBLE PRECISION,
    metadata      JSONB,
    created_at    TIMESTAMPTZ     DEFAULT NOW()
);

ALTER TABLE vss_events
    ADD CONSTRAINT vss_events_unique
    UNIQUE (camera_id, event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_vss_events_camera_id  ON vss_events (camera_id);
CREATE INDEX IF NOT EXISTS idx_vss_events_event_type ON vss_events (event_type);
CREATE INDEX IF NOT EXISTS idx_vss_events_timestamp  ON vss_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vss_events_location   ON vss_events USING GIST (location);
