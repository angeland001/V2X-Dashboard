# Trip Layer Implementation Guide

## Overview
The Data Layers page uses the **Mapbox Directions API** to fetch real routes around Chattanooga and display them as animated Trip layers in Kepler.gl.

## How to Use

### 1. Access the Page
Navigate to the Data Layers page in your application.

### 2. Load Trips
Click the **"Load REAL Chattanooga Trips"** button in the top-right corner. This will:
- Fetch 8 real routes from the Mapbox Directions API
- Transform them into the correct Kepler.gl Trip layer format
- Display them with animated trails on the map

### 3. View Animation
The trips will animate showing movement along real Chattanooga roads with colored trails. Click the play button in the timeline at the bottom to start the animation.

## Current Routes
The implementation includes 8 real Chattanooga routes:
1. **Route A**: Downtown → UTC Campus
2. **Route B**: UTC → Hamilton Place Mall
3. **Route C**: Downtown → Lookout Mountain
4. **Route D**: Hixson → Downtown
5. **Route E**: East Brainerd → Downtown
6. **Route F**: Tennessee Aquarium → Coolidge Park (walking)
7. **Route G**: Chattanooga Airport → Downtown
8. **Route H**: Red Bank → Riverfront

## Adding Your Own Routes

The implementation now uses the **Mapbox Directions API** to automatically fetch real road routes. To add new routes, edit the `CHATTANOOGA_ROUTES` array in `DataLayersMap.js`:

```javascript
const CHATTANOOGA_ROUTES = [
  {
    vendor: "Route A",
    name: "Downtown → UTC Campus",
    profile: "driving",  // Options: "driving", "walking", "cycling"
    start: [-85.3097, 35.0456], // [longitude, latitude]
    end: [-85.3003, 35.0646],   // [longitude, latitude]
  },
  // Add more routes here...
];
```

### Route Properties
- **vendor**: Unique identifier for the route (e.g., "Route A", "Route B")
- **name**: Descriptive name shown in tooltips
- **profile**: Transportation mode - "driving", "walking", or "cycling"
- **start**: Starting coordinates [longitude, latitude]
- **end**: Ending coordinates [longitude, latitude]

The Mapbox API will automatically:
- Calculate the optimal route following real roads
- Return hundreds of coordinates along the path
- Handle the coordinate format conversion

### Coordinate Format (CRITICAL)
Kepler.gl Trip layers require **4 values** per coordinate:
```javascript
[longitude, latitude, altitude, timestamp]
```

**Example**: `[-85.3097, 35.0456, 0, 0]`
- **Longitude**: -85.3097 (first value)
- **Latitude**: 35.0456 (second value)
- **Altitude**: 0 (third value, typically 0)
- **Timestamp**: 0 (fourth value, incrementing for animation)

The implementation automatically converts Mapbox's `[lng, lat]` format to Kepler's `[lng, lat, alt, time]` format.

### Chattanooga Reference Points
```javascript
// Downtown Chattanooga
[-85.3097, 35.0456]

// Northshore
[-85.3020, 35.0530]

// Lookout Mountain
[-85.3500, 35.0150]

// UTC Campus
[-85.3023, 35.0456]

// Riverfront
[-85.3100, 35.0500]
```

## Customization Options

### Trip Layer Visual Configuration
Located in the `loadTripData()` function (lines 142-153):

```javascript
visConfig: {
  opacity: 0.8,              // Trail opacity (0-1)
  thickness: 2,              // Line thickness
  colorRange: {
    colors: [                // Gradient colors for trail
      "#5A1846",            // Purple
      "#900C3F",            // Dark Red
      "#C70039",            // Red
      "#E3611C",            // Orange
      "#F1920E",            // Light Orange
      "#FFC300"             // Yellow
    ],
  },
  trailLength: 180,         // Length of animated trail (seconds)
  sizeRange: [0, 10],       // Size range for visualization
}
```

### Color Schemes
You can use these preset color schemes:

**Global Warming** (current):
```javascript
["#5A1846", "#900C3F", "#C70039", "#E3611C", "#F1920E", "#FFC300"]
```

**Cool to Warm**:
```javascript
["#4575b4", "#91bfdb", "#e0f3f8", "#fee090", "#fc8d59", "#d73027"]
```

**Viridis**:
```javascript
["#440154", "#31688e", "#35b779", "#fde724"]
```

**Grayscale**:
```javascript
["#1a1a1a", "#2d2d2d", "#404040", "#535353", "#666666", "#999999"]
```

## Tips for Creating Trips

### 1. Getting Coordinates
- Use Google Maps: Right-click → "What's here?" → Copy coordinates
- Use Mapbox: Click on map to get coordinates
- Use GPS data from your actual routes

### 2. Route Planning
- More points = smoother animation
- Space points evenly along the route
- Use actual street/path coordinates for realistic visualization

### 3. Timestamps
- Use Unix timestamps (seconds since Jan 1, 1970)
- Convert dates: `Math.floor(new Date('2024-01-15 08:00:00').getTime() / 1000)`
- Or use online converters: https://www.unixtimestamp.com/

### 4. Multiple Trips
Add multiple features to show different routes:

```javascript
features: [
  { /* Trip 1 */ },
  { /* Trip 2 */ },
  { /* Trip 3 */ },
  // Add as many as needed
]
```

## Animation Controls

Once trips are loaded, you can control the animation using Kepler.gl's built-in controls:

1. **Play/Pause**: Bottom timeline control
2. **Speed**: Adjust playback speed
3. **Time Range**: Select specific time periods
4. **Layer Settings**: Click layer name in sidebar to adjust:
   - Color
   - Thickness
   - Trail length
   - Opacity

## Common Issues

### Trips Not Showing
- **MOST COMMON**: Ensure coordinates have **4 values**: `[longitude, latitude, altitude, timestamp]`
  - WRONG (3 values): `[-85.3097, 35.0456, 1704963600]` ❌
  - CORRECT (4 values): `[-85.3097, 35.0456, 0, 1704963600]` ✅
  - The timestamp is the **4th** value, not the 3rd
- Check that the field name is `"geojson"` (not `"_geojson"`) in the dataset fields
- Verify Mapbox API token is set in `.env` as `REACT_APP_MAPBOX_API`
- Check browser console for API errors or network issues

### Animation Not Playing
- Click the play button in the timeline at the bottom
- Check that timestamps are set correctly
- Verify the time range includes your trip times

### Wrong Location
- Double-check longitude comes before latitude
- Verify coordinates are for Chattanooga area:
  - Longitude: around -85.3
  - Latitude: around 35.04

## Example: Adding a Custom Route

To add a new route from Signal Mountain to Downtown:

```javascript
const CHATTANOOGA_ROUTES = [
  // ... existing routes ...
  {
    vendor: "Route I",
    name: "Signal Mountain → Downtown",
    profile: "driving",
    start: [-85.3465, 35.1234], // Signal Mountain
    end: [-85.3097, 35.0456],   // Downtown Chattanooga
  },
];
```

The Mapbox API will automatically:
1. Fetch the real driving route between these points
2. Return hundreds of coordinates following actual roads
3. Convert to the correct format: `[lng, lat, altitude, timestamp]`
4. Display as an animated trip layer

## Technical Details

### How the Implementation Works

1. **Fetch Routes**: Calls Mapbox Directions API for each route definition
2. **Sample Points**: Reduces coordinate density to ~800 points per route for performance
3. **Add Timestamps**: Converts `[lng, lat]` to `[lng, lat, 0, timestamp]` format
4. **Stagger Animation**: Each route starts at a different timestamp offset
5. **Dispatch to Kepler**: Sends formatted data to Kepler.gl with Trip layer configuration

### Key Functions

- `fetchRouteFromMapbox()`: Fetches route from Mapbox Directions API
- `toTripCoords()`: Converts coordinates to Trip format with timestamps
- `samplePoints()`: Reduces point density for performance

## Resources
- [Kepler.gl Trip Layer Documentation](https://docs.kepler.gl/docs/user-guides/c-types-of-layers/k-trip)
- [GeoJSON Format Specification](https://geojson.org/)
- [Unix Timestamp Converter](https://www.unixtimestamp.com/)
- [Chattanooga Map](https://www.google.com/maps/place/Chattanooga,+TN/)
