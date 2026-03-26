/**
 * TomTom API Configuration
 *
 * Centralized config for all TomTom service endpoints.
 * API key is read from client/.env as REACT_APP_TOMTOM_API.
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../../client/.env"),
});

const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API;

if (!TOMTOM_API_KEY) {
  console.warn("WARNING: REACT_APP_TOMTOM_API is not set in client/.env");
}

// Default bounding box: Chattanooga, TN
const DEFAULT_BBOX = "-85.40,34.97,-85.20,35.11";

const BASE_URLS = {
  // Incident Details (Orbis Maps v1)
  incidentDetails:
    "https://api.tomtom.com/traffic/services/5/incidentDetails",

  // Incident Viewport
  incidentViewport:
    "https://api.tomtom.com/traffic/services/5/incidentViewport",

  // Flow Segment Data
  flowSegment:
    "https://api.tomtom.com/traffic/services/4/flowSegmentData",

  // Raster tile templates — replace {z}, {x}, {y} at call time
  incidentTileRaster:
    "https://api.tomtom.com/traffic/map/4/tile/incidents",

  // Vector tile templates
  incidentTileVector:
    "https://api.tomtom.com/traffic/map/4/tile/incidents",

  // Flow raster tiles
  flowTileRaster:
    "https://api.tomtom.com/traffic/map/4/tile/flow",

  // Flow vector tiles
  flowTileVector:
    "https://api.tomtom.com/traffic/map/4/tile/flow",
};

module.exports = {
  TOMTOM_API_KEY,
  DEFAULT_BBOX,
  BASE_URLS,
};
