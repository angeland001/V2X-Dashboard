/**
 * TomTom Analytics API Routes
 */

const dotenv = require("dotenv");
const path = require("path");
const express = require("express");
const router = express.Router();

const fetch = globalThis.fetch || require("node-fetch");


dotenv.config({
  path: path.resolve(__dirname, "../../../client/.env"),
});


const ChattanoogaBBox = "-85.40,34.97,-85.20,35.11";

const TOM_TOM_BASE_URL =
  `https://api.tomtom.com/maps/orbis/traffic/incidentDetails` +
  `?apiVersion=1` +
  `&key=${process.env.REACT_APP_TOMTOM_API}` +
  `&bbox=${ChattanoogaBBox}` +
  `&timeValidityFilter=present`;

// Test route
router.get("/", (req, res) => {
  res.send("Successfully loaded TomTom Analytics API routes");
});

// Fetch traffic incidents
router.get("/traffic-incidents", async (req, res) => {
  try {
    const response = await fetch(TOM_TOM_BASE_URL);

    if (!response.ok) {
      throw new Error(`TomTom API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching TomTom traffic incidents:", error);
    res.status(500).json({
      error: "Failed to fetch TomTom traffic incidents",
      message: error.message,
    });
  }
});

module.exports = router;
