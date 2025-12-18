/**
 * Simple PostGIS Database Connection
 *
 * Basic connection to PostgreSQL with PostGIS for storing and querying spatial data
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.POSTGIS_HOST || 'localhost',
  port: process.env.POSTGIS_PORT || 5432,
  database: process.env.POSTGIS_DATABASE || 'kepler_db',
  user: process.env.POSTGIS_USER || 'postgres',
  password: process.env.POSTGIS_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

// Simple query function
const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

module.exports = { pool, query };
