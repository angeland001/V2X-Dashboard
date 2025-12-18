# Quick Start Guide - PostGIS Server

## Step 1: Make Sure PostgreSQL is Running

**Check if PostgreSQL is running:**
```bash
pg_isready
```

If not running, start it:
- **Windows**: Open Services and start "postgresql-x64-xx"
- **Mac**: `brew services start postgresql`
- **Linux**: `sudo service postgresql start`

## Step 2: Create Database and Run Setup

**Open a new terminal in VSCode and run these commands:**

```bash
# Connect to PostgreSQL (use your password: 12345)
psql -U postgres

# Inside psql, run:
CREATE DATABASE kepler_gis;
\c kepler_gis
CREATE EXTENSION postgis;

# Exit psql
\q
```

**Then run the setup SQL file:**
```bash
psql -U postgres -d kepler_gis -f server/database/setup.sql
```

Enter password: `12345`

## Step 3: Start the Server

**In your VSCode terminal:**
```bash
cd server
node index.js
```

You should see:
```
Server running on port 3001
API available at http://localhost:3001/api/spatial/data
```

## Step 4: Test the Server

**Open a new terminal and test:**
```bash
# Test server is running
curl http://localhost:3001/health

# Test database connection
curl http://localhost:3001/api/test-db

# Test spatial data endpoint
curl http://localhost:3001/api/spatial/data
```

## Step 5: Start React Frontend

**In a separate terminal:**
```bash
cd client
npm start
```

Your app should now load without errors!

## Troubleshooting

**Error: "Failed to fetch"**
- Make sure server is running on port 3001
- Check CORS is enabled (we just added this)

**Error: "Database connection failed"**
- Verify PostgreSQL is running: `pg_isready`
- Check .env file has correct credentials
- Make sure database exists: `psql -U postgres -l`

**Error: "relation 'spatial_data' does not exist"**
- Run the setup.sql file: `psql -U postgres -d kepler_gis -f server/database/setup.sql`

## Quick Commands

```bash
# Start server (from root directory)
node server/index.js

# Or use nodemon for auto-restart
npm install -g nodemon
nodemon server/index.js
```
