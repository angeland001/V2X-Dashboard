/**
 * SDSM (Sensor Data Sharing Message) Configuration
 *
 * Single source of truth for the external CV2X API URL and intersection list.
 * Used by the SDSM poller and API routes so they always target the same
 * endpoints and intersection set.
 */

const SDSM_BASE_URL =
  "http://roadaware.cuip.research.utc.edu/cv2x/latest/sdsm_events";

const INTERSECTIONS = ["MLK_Georgia", "MLK_Lindsay"];

module.exports = {
  SDSM_BASE_URL,
  INTERSECTIONS,
};
