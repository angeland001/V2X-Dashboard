/**
 * TomTom API — Barrel Router
 *
 * Mounts all TomTom sub-routers under /api/tomtom
 */

const express = require("express");
const router = express.Router();

const incidentRoutes = require("./incidents");
const flowRoutes = require("./flow");
const tileRoutes = require("./tiles");

router.use("/incidents", incidentRoutes);
router.use("/flow", flowRoutes);
router.use("/tiles", tileRoutes);

// Health check for the TomTom module
router.get("/", (req, res) => {
  res.json({ status: "TomTom API routes loaded" });
});

module.exports = router;
