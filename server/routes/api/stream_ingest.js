const express = require("express");

const router = express.Router();
const BUFFER_SIZE = 100;

// In-memory ring buffer: stream_id → last N events
const streams = {};

function getBuffer(streamId) {
  if (!streams[streamId]) streams[streamId] = [];
  return streams[streamId];
}

// POST /api/stream-ingest  { stream: "spat-events", data: { ... } }
router.post("/", (req, res) => {
  const { stream, data } = req.body;
  if (!stream || data === undefined) {
    return res.status(400).json({ error: "stream and data are required" });
  }

  const buf = getBuffer(stream);
  buf.push({ receivedAt: new Date().toISOString(), data });
  if (buf.length > BUFFER_SIZE) buf.shift();

  res.json({ ok: true });
});

// GET /api/stream-ingest/:streamId/latest?intersection=MLK_Georgia
// Returns the single most-recent event, optionally filtered by a field value.
// Avoids sending the full 100-event buffer to the client for live polling.
router.get("/:streamId/latest", (req, res) => {
  const buf = getBuffer(req.params.streamId);
  const { intersection } = req.query;

  if (intersection) {
    const match = [...buf].reverse().find((e) => e.data?.intersection === intersection);
    return res.json({ stream: req.params.streamId, event: match ?? null });
  }

  res.json({ stream: req.params.streamId, event: buf.at(-1) ?? null });
});

// GET /api/stream-ingest/:streamId  — latest events for one stream
router.get("/:streamId", (req, res) => {
  res.json({
    stream: req.params.streamId,
    events: getBuffer(req.params.streamId),
  });
});

// GET /api/stream-ingest  — active stream summary
router.get("/", (req, res) => {
  res.json({
    streams: Object.keys(streams).map((id) => ({
      id,
      count: streams[id].length,
      latest: streams[id].at(-1)?.receivedAt ?? null,
    })),
  });
});

module.exports = { router, streams };
