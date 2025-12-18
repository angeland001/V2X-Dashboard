# PostGIS + Kepler.gl Quick Setup

Simple guide to get PostGIS data displaying on your Kepler.gl map.

## Prerequisites

- PostgreSQL installed with PostGIS extension
- Node.js

## Quick Start

### 1. Install PostgreSQL with PostGIS

**Using Docker (easiest):**
```bash
docker run --name postgis \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgis/postgis
```

**Or install locally:**
- Ubuntu: `sudo apt-get install postgresql postgis`
- Mac: `brew install postgresql postgis`
- Windows: Download from https://www.postgresql.org/download/windows/

### 2. Set Up Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE kepler_db;
\c kepler_db

# Run the setup file
\i server/database/setup.sql

# Or manually:
CREATE EXTENSION postgis;
```

### 3. Configure Environment

Create `.env` file in server directory:

```env
POSTGIS_HOST=localhost
POSTGIS_PORT=5432
POSTGIS_DATABASE=kepler_db
POSTGIS_USER=postgres
POSTGIS_PASSWORD=postgres
```

### 4. Install Dependencies

```bash
cd server
npm install pg dotenv
```

### 5. Add to Your Express Server

In your main server file (e.g., `server/index.js`):

```javascript
const express = require('express');
const spatialRoutes = require('./routes/spatial');

const app = express();

app.use(express.json());
app.use('/api/spatial', spatialRoutes);

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### 6. Connect to Kepler.gl

In your React component:

```javascript
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addDataToMap } from '@kepler.gl/actions';
import KeplerGl from '@kepler.gl/components';

function MapWithPostGIS() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Fetch data from PostGIS
    fetch('http://localhost:3001/api/spatial/data')
      .then(res => res.json())
      .then(data => {
        dispatch(
          addDataToMap({
            datasets: {
              info: {
                label: 'PostGIS Data',
                id: 'postgis-data'
              },
              data  // Already in Kepler.gl format
            },
            option: {
              centerMap: true
            },
            config: {
              mapState: {
                latitude: 35.0456,
                longitude: -85.3097,
                zoom: 11
              }
            }
          })
        );
      });
  }, [dispatch]);

  return <KeplerGl id="map" mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API} />;
}
```

## File Structure

```
server/
├── database/
│   ├── postgis.js    # Database connection
│   └── setup.sql     # Initial database setup
└── routes/
    └── spatial.js    # API endpoints
```

## API Endpoints

**GET /api/spatial/data**
- Returns spatial data in Kepler.gl format

**POST /api/spatial/data**
- Add new point
- Body: `{ name: "Point Name", latitude: 35.0456, longitude: -85.3097 }`

## Common SQL Queries

**Add a point:**
```sql
INSERT INTO spatial_data (name, location)
VALUES ('Point Name', ST_SetSRID(ST_MakePoint(-85.3097, 35.0456), 4326));
```

**Find points within radius (in meters):**
```sql
SELECT name,
  ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(-85.3097, 35.0456), 4326)::geography
  ) as distance
FROM spatial_data
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(-85.3097, 35.0456), 4326)::geography,
  5000  -- 5km radius
);
```

## Troubleshooting

**Can't connect to database:**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`

**PostGIS extension error:**
```sql
-- Run in psql:
CREATE EXTENSION postgis;
```

**No data showing:**
- Check API endpoint is returning data: `curl http://localhost:3001/api/spatial/data`
- Verify table has data: `SELECT * FROM spatial_data;`

## Next Steps

- Customize the `spatial_data` table schema
- Add more API endpoints as needed
- Import your own spatial data (GeoJSON, CSV with lat/long, etc.)

## Resources

- [PostGIS Documentation](https://postgis.net/docs/)
- [Kepler.gl Data Format](https://docs.kepler.gl/docs/api-reference/data-format)
