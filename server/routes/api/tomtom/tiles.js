/**
 * TomTom Tile Proxy Routes
 *
 * Proxies tile requests so the API key stays server-side.
 * The frontend map layer points at these URLs instead of TomTom directly.
 *
 * GET /incidents/raster/:z/:x/:y  - Raster incident tiles
 * GET /incidents/vector/:z/:x/:y  - Vector incident tiles
 * GET /flow/raster/:z/:x/:y      - Raster flow tiles
 * GET /flow/vector/:z/:x/:y      - Vector flow tiles
 */

const express = require("express");
const router = express.Router();
const { BASE_URLS } = require("../../../config/tomtom");
const tomtom = require("../../../services/tomtomClient");

// Helper: build tile URL and proxy the response
async function proxyTile(req, res, baseTileUrl, format) {
  try {
    const { z, x, y } = req.params;
    // TomTom tile URL pattern: {base}/{format}/{z}/{x}/{y}.{ext}
    const ext = format === "vector" ? "pbf" : "png";
    const url = `${baseTileUrl}/${format}/${z}/${x}/${y}.${ext}`;

    const { buffer, contentType } = await tomtom.getRaw(url);

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=60");
    res.send(buffer);
  } catch (error) {
    console.error("Tile proxy error:", error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
}

// --- Incident tiles ---

router.get("/incidents/raster/:z/:x/:y", (req, res) => {
  proxyTile(req, res, BASE_URLS.incidentTileRaster, "raster");
});

router.get("/incidents/vector/:z/:x/:y", (req, res) => {
  proxyTile(req, res, BASE_URLS.incidentTileVector, "vector");
});

// --- Flow tiles ---

router.get("/flow/raster/:z/:x/:y", (req, res) => {
  proxyTile(req, res, BASE_URLS.flowTileRaster, "raster");
});

router.get("/flow/vector/:z/:x/:y", (req, res) => {
  proxyTile(req, res, BASE_URLS.flowTileVector, "vector");
});

module.exports = router;
