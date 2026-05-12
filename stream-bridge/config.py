import os

CUIP_API_KEY = os.environ.get("CUIP_API_KEY", "")

# Node server URL where stream events are forwarded
NODE_INGEST_URL = os.environ.get(
    "NODE_INGEST_URL", "http://localhost:3001/api/stream-ingest"
)

# Streams to subscribe to — comment out anything you don't need yet.
# High-frequency: spat-events, sdsm-events, all-lidars-events, georgia-lidar-events
# ~1/min: gs-realtime-zone
# Event-triggered: bsm-events, srm-events, ssm-events
STREAMS = [
    "spat-events",
    # "sdsm-events",          # covered by sdsmPoller for now; swap later
    # "bsm-events",
    # "srm-events",
    # "ssm-events",
    # "all-lidars-events",
    # "georgia-lidar-events",
    # "gs-realtime-zone",
]
