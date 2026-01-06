/**
 * Spatial Data Routes - Redirects to Geofence Routes
 *
 * This route is deprecated. All spatial data now uses the geofence API.
 * Keeping for backwards compatibility.
 */

const express = require('express');
const router = express.Router();

// Redirect to geofences endpoint
router.get('/data', async (req, res) => {
  res.redirect('/api/geofences');
});

module.exports = router;
