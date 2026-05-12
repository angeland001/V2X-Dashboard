// VSS (NVIDIA Video Search and Summarization) configuration.
// Set VSS_BASE_URL and VSS_API_KEY in server/.env before enabling the poller.

const VSS_BASE_URL = process.env.VSS_BASE_URL || "http://localhost:8080"; // TODO: set VSS host
const VSS_API_KEY  = process.env.VSS_API_KEY  || "";                       // TODO: set API key

// TODO: replace with actual camera / stream IDs from your VSS deployment
const CAMERAS = [
    "camera_01",
    "camera_02",
];

const POLL_INTERVAL_MS = 30_000;

module.exports = { VSS_BASE_URL, VSS_API_KEY, CAMERAS, POLL_INTERVAL_MS };
