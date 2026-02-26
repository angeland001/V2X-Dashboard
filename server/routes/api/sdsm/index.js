/**
 * SDSM API — Barrel Router
 *
 * Mounts all SDSM sub-routers under /api/sdsm
 */

const express = require("express");
const router = express.Router();

const sdsmRoutes = require("./sdsm");
const overviewRoutes = require("./overview");

// Core SDSM endpoints (latest, store, history, analytics, geojson, cleanup)
router.use("/", sdsmRoutes);

// Overview-specific aggregation endpoints
router.use("/overview", overviewRoutes);

module.exports = router;
