/**
 * TomTom Traffic Flow Routes
 *
 * GET /segment  - Get speed/travel time for the nearest road segment
 */

const express = require("express");
const router = express.Router();
const { BASE_URLS } = require("../../../config/tomtom");
const tomtom = require("../../../services/tomtomClient");

// GET /api/tomtom/flow/segment?lat=35.04&lon=-85.30&zoom=10
router.get("/segment", async (req, res) => {
  try {
    const { lat, lon, zoom } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "lat and lon query parameters are required" });
    }

    // Flow segment endpoint uses path-style coords: .../style/zoom/point
    // Adjust the URL construction to match TomTom's expected format
    const style = "absolute"; // or "relative", "relative-delay"
    const zoomLevel = zoom || 10;
    const point = `${lat},${lon}`;
    const url = `${BASE_URLS.flowSegment}/${style}/${zoomLevel}/json`;

    const data = await tomtom.get(url, {
      point,
      // TODO: add unit, thickness, openLr params if needed
    });

    res.json(data);
  } catch (error) {
    console.error("Error fetching flow segment:", error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
