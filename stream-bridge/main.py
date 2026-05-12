import asyncio
import logging

import httpx
import cuip

from config import CUIP_API_KEY, NODE_INGEST_URL, STREAMS

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# Bridges the SDK's sync callback into async HTTP forwarding
_queue: asyncio.Queue = None


def _make_callback(stream_id: str):
    def cb(data):
        _queue.put_nowait({"stream": stream_id, "data": data})
    return cb


async def _forwarder():
    """Drain the queue and POST each event to the Node server."""
    async with httpx.AsyncClient() as client:
        while True:
            event = await _queue.get()
            try:
                await client.post(NODE_INGEST_URL, json=event, timeout=5.0)
            except Exception as exc:
                log.error("Forward failed [%s]: %s", event.get("stream"), exc)
            finally:
                _queue.task_done()


async def _listen(stream_id: str):
    log.info("Subscribing → %s", stream_id)
    await cuip.Streams(CUIP_API_KEY).process_ws_stream(
        _make_callback(stream_id), stream_id
    )


async def main():
    global _queue
    _queue = asyncio.Queue()

    if not CUIP_API_KEY:
        log.warning("CUIP_API_KEY is not set — authentication will fail")

    if not STREAMS:
        log.warning("No streams configured in config.py — nothing to subscribe to")
        return

    await asyncio.gather(
        _forwarder(),
        *[_listen(sid) for sid in STREAMS],
    )


if __name__ == "__main__":
    asyncio.run(main())
