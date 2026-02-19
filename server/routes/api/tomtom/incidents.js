/**
 * TomTom Traffic Incidents Routes
 *
 * GET /              - Fetch incident details for a bounding box
 * GET /viewport      - Get viewport metadata for a map view
 */

const express = require("express");
const router = express.Router();
const { BASE_URLS, DEFAULT_BBOX } = require("../../../config/tomtom");
const tomtom = require("../../../services/tomtomClient");

// GET /api/tomtom/incidents?bbox=-85.40,34.97,-85.20,35.11
router.get("/", async (req, res) => {
  try {
    const bbox = req.query.bbox || DEFAULT_BBOX;

    const data = await tomtom.get(BASE_URLS.incidentDetails, {
      bbox,
      timeValidityFilter: "present",
      // TODO: add any additional params you need
      // categoryFilter, language, fields, etc.
    });

    res.json(data);
  } catch (error) {
    console.error("Error fetching traffic incidents:", error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// GET /api/tomtom/incidents/viewport?bbox=-85.40,34.97,-85.20,35.11
router.get("/viewport", async (req, res) => {
  try {
    const bbox = req.query.bbox || DEFAULT_BBOX;

    const data = await tomtom.get(BASE_URLS.incidentViewport, {
      bbox,
      // TODO: add overviewBox, copyright params if needed
    });

    res.json(data);
  } catch (error) {
    console.error("Error fetching incident viewport:", error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
