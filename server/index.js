const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

// Debug: Log environment variables
console.log("Environment variables loaded:");
console.log("POSTGIS_HOST:", process.env.POSTGIS_HOST);
console.log("POSTGIS_PORT:", process.env.POSTGIS_PORT);

const authRoutes = require("./routes/authroutes/auth");
const userRoutes = require("./routes/authroutes/users");
const sdsmRoutes = require("./routes/api/sdsm");
const tomtomRoutes = require("./routes/api/tomtom");
const intersectionRoutes = require("./routes/intersectionroutes/intersections");
const laneRoutes = require("./routes/intersectionroutes/lanes");
const crosswalkRoutes = require("./routes/intersectionroutes/crosswalks");
const laneConnectionRoutes = require("./routes/intersectionroutes/lane_connections");
const spatZoneRoutes = require("./routes/spat_zones"); // adjust path if needed
const preemptionZoneConfigRoutes = require("./routes/preemption_zone_configs"); // adjust path if needed

const db = require("./database/postgis");
const sdsmPoller = require("./services/sdsmPoller");

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());



// Mount auth routes
app.use("/api/auth", authRoutes);
// Mount user routes
app.use("/api/users", userRoutes);
// Mount SDSM and TOMTOM routes
app.use("/api/sdsm", sdsmRoutes);
app.use("/api/tomtom", tomtomRoutes);
// Mount V2X MapData routes
app.use("/api/intersections", intersectionRoutes);
app.use("/api/lanes", laneRoutes);
app.use("/api/crosswalks", crosswalkRoutes);
app.use("/api/lane-connections", laneConnectionRoutes);
app.use("/api/spat-zones", spatZoneRoutes);
app.use("/api/preemption-zone-config", preemptionZoneConfigRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({
      success: true,
      message: "Database connected",
      time: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start ingesting live SDSM data into the database
  sdsmPoller.start();
  console.log(`Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`User API: http://localhost:${PORT}/api/users`);
  console.log(`SDSM API: http://localhost:${PORT}/api/sdsm`);
  console.log(`TomTom API: http://localhost:${PORT}/api/tomtom`);
  console.log(`Intersections API: http://localhost:${PORT}/api/intersections`);
  console.log(`Lanes API: http://localhost:${PORT}/api/lanes`);
  console.log(`Crosswalks API: http://localhost:${PORT}/api/crosswalks`);
  console.log(
    `Lane Connections API: http://localhost:${PORT}/api/lane-connections`,
  );
  console.log(`SPaT Zones API: http://localhost:${PORT}/api/spat-zones`);
  console.log(
    `Preemption Zone Config API: http://localhost:${PORT}/api/preemption-zone-config`,
  );
});
