const db = require("../database/postgis");
const fetch = globalThis.fetch || require("node-fetch");
const { VSS_BASE_URL, VSS_API_KEY, CAMERAS, POLL_INTERVAL_MS } = require("../config/vss");

let intervalId = null;

async function ingestCamera(cameraId) {
    // TODO: adjust the endpoint path to match your VSS deployment's events API.
    // Example paths: /api/v1/events, /vss/events, /alerts, etc.
    const url = `${VSS_BASE_URL}/api/v1/events?camera_id=${encodeURIComponent(cameraId)}`;

    const response = await fetch(url, {
        headers: {
            // TODO: adjust auth scheme (Bearer, x-api-key, etc.) to match VSS docs
            ...(VSS_API_KEY ? { Authorization: `Bearer ${VSS_API_KEY}` } : {}),
        },
    });

    if (!response.ok) {
        console.warn(`[VSS Poller] ${cameraId}: API returned ${response.status}`);
        return 0;
    }

    const data = await response.json();

    // TODO: adjust to match the actual VSS response shape.
    // The array of events may be at data.events, data.results, data.alerts, etc.
    const events = data.events || data.results || data.alerts || [];

    if (!Array.isArray(events) || events.length === 0) return 0;

    const insertPromises = events.map((evt) => {
        // TODO: map VSS event fields to the columns below.
        // Common VSS field names are shown as examples — adjust as needed.
        const streamName  = evt.stream_name  || evt.camera_name  || null;
        const eventType   = evt.event_type   || evt.type         || "unknown";
        const timestamp   = evt.timestamp    || evt.time         || new Date().toISOString();
        const longitude   = evt.longitude    || evt.location?.lng || evt.location?.longitude || null;
        const latitude    = evt.latitude     || evt.location?.lat || evt.location?.latitude  || null;
        const description = evt.description  || evt.summary      || evt.caption || null;
        const confidence  = evt.confidence   || evt.score        || null;

        return db.query(
            `
            INSERT INTO vss_events (
                camera_id, stream_name, event_type, timestamp,
                location, longitude, latitude,
                description, confidence, metadata
            ) VALUES (
                $1, $2, $3, $4,
                CASE WHEN $5::float IS NOT NULL AND $6::float IS NOT NULL
                     THEN ST_SetSRID(ST_MakePoint($5, $6), 4326)
                     ELSE NULL END,
                $5, $6,
                $7, $8, $9
            )
            ON CONFLICT (camera_id, event_type, timestamp) DO NOTHING
            RETURNING id;
            `,
            [cameraId, streamName, eventType, timestamp, longitude, latitude, description, confidence, JSON.stringify(evt)],
        );
    });

    const results = await Promise.all(insertPromises);
    return results.filter((r) => r.rows.length > 0).length;
}

async function pollOnce() {
    for (const cameraId of CAMERAS) {
        try {
            const inserted = await ingestCamera(cameraId);
            if (inserted > 0) {
                console.log(`[VSS Poller] ${cameraId}: ingested ${inserted} new events`);
            }
        } catch (err) {
            console.error(`[VSS Poller] ${cameraId}: ${err.message}`);
        }
    }
}

function start() {
    if (intervalId) return;
    console.log(`[VSS Poller] Starting — polling every ${POLL_INTERVAL_MS / 1000}s for ${CAMERAS.join(", ")}`);
    pollOnce();
    intervalId = setInterval(pollOnce, POLL_INTERVAL_MS);
}

function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("[VSS Poller] Stopped");
    }
}

module.exports = { start, stop };
