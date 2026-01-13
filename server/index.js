const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

// Debug: Log environment variables
console.log("Environment variables loaded:");
console.log("POSTGIS_HOST:", process.env.POSTGIS_HOST);
console.log("POSTGIS_PORT:", process.env.POSTGIS_PORT);

const geofenceRoutes = require("./routes/geofences");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const sdsmRoutes = require("./routes/sdsm");
const db = require("./database/postgis");

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount geofence routes
app.use("/api/geofences", geofenceRoutes);
// Mount auth routes
app.use("/api/auth", authRoutes);
// Mount user routes
app.use("/api/users", userRoutes);
// Mount SDSM routes
app.use("/api/sdsm", sdsmRoutes);

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
  console.log(`Geofence API: http://localhost:${PORT}/api/geofences`);
  console.log(`Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`User API: http://localhost:${PORT}/api/users`);
  console.log(`SDSM API: http://localhost:${PORT}/api/sdsm`);
});
