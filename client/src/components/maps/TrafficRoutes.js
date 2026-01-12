import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap, wrapTo, resetMapConfig } from "@kepler.gl/actions";
import { processGeojson } from "@kepler.gl/processors";

// Chattanooga route definitions - real locations
const CHATTANOOGA_ROUTES = [
  {
    vendor: "Route A",
    name: "Downtown → UTC Campus",
    profile: "driving",
    start: [-85.3097, 35.0456],
    end: [-85.3003, 35.0646],
  },
  {
    vendor: "Route B",
    name: "UTC → Hamilton Place Mall",
    profile: "driving",
    start: [-85.3003, 35.0646],
    end: [-85.1539, 35.034],
  },
  {
    vendor: "Route C",
    name: "Downtown → Lookout Mountain",
    profile: "driving",
    start: [-85.3097, 35.0456],
    end: [-85.3408, 35.0006],
  },
  {
    vendor: "Route D",
    name: "Hixson → Downtown",
    profile: "driving",
    start: [-85.2076, 35.104],
    end: [-85.3097, 35.0456],
  },
  {
    vendor: "Route E",
    name: "East Brainerd → Downtown",
    profile: "driving",
    start: [-85.15, 35.035],
    end: [-85.3097, 35.0456],
  },
  {
    vendor: "Route F",
    name: "Tennessee Aquarium → Coolidge Park",
    profile: "walking",
    start: [-85.3096, 35.0451],
    end: [-85.3074, 35.0591],
  },
  {
    vendor: "Route G",
    name: "Chattanooga Airport → Downtown",
    profile: "driving",
    start: [-85.2036, 35.0354],
    end: [-85.3097, 35.0456],
  },
  {
    vendor: "Route H",
    name: "Red Bank → Riverfront",
    profile: "driving",
    start: [-85.2965, 35.1162],
    end: [-85.31, 35.05],
  },
];

// Helper: sample/reduce points if there are too many
function samplePoints(points, maxPoints = 1200) {
  if (!points || points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < points.length; i += step) sampled.push(points[i]);
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
}

// Spread timestamps over the route so Trip animation progresses
function toTripCoordsWithDuration(pointsLngLat, startUnixSec, durationSec) {
  const n = pointsLngLat.length;
  if (n < 2) return [];
  const safeDuration = Math.max(60, Math.floor(durationSec || 0)); // at least 60s
  return pointsLngLat.map(([lng, lat], i) => {
    const t = startUnixSec + Math.round((i / (n - 1)) * safeDuration);
    return [lng, lat, 0, t];
  });
}

// Fetch route from Mapbox Directions API (returns geometry + duration)
async function fetchRouteFromMapbox({ start, end, profile, token }) {
  const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Mapbox Directions failed (${res.status}): ${text || res.statusText}`
    );
  }

  const json = await res.json();
  const route = json?.routes?.[0];
  const lineCoords = route?.geometry?.coordinates; // [[lng,lat], ...]
  const duration = route?.duration; // seconds
  const distance = route?.distance; // meters

  if (!lineCoords || !Array.isArray(lineCoords) || lineCoords.length < 2) {
    throw new Error("Mapbox returned no route geometry.");
  }

  return { lineCoords, duration, distance };
}

function DataLayersMap() {
  const dispatch = useDispatch();
  const containerRef = useRef(null);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [statusMessage, setStatusMessage] = useState("Loading routes...");
  const [loading, setLoading] = useState(true);

  // Hide scrollbars for this page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize base map once
  useEffect(() => {
    dispatch(
      wrapTo(
        "data-layers",
        addDataToMap({
          datasets: {
            info: { label: "Empty", id: "data-layers" },
            data: { fields: [], rows: [] },
          },
          options: {
            centerMap: true,
            readOnly: false,
            keepExistingConfig: false,
          },
          config: {
            mapState: {
              latitude: 35.0456,
              longitude: -85.3097,
              zoom: 12,
              pitch: 50,
              bearing: 0,
            },
            mapStyle: { styleType: "dark" },
          },
        })
      )
    );
  }, [dispatch]);

  // ✅ AUTO-LOAD AND AUTO-PLAY ON PAGE LOAD
  useEffect(() => {
    let cancelled = false;

    const loadAndPlay = async () => {
      const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API;

      if (!MAPBOX_TOKEN) {
        setStatusMessage(
          "Missing REACT_APP_MAPBOX_API. Add your Mapbox token to .env"
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatusMessage("Fetching real routes from Mapbox Directions API...");

      try {
        // Clear old config so we start clean every time user enters
        dispatch(wrapTo("data-layers", resetMapConfig()));

        const results = await Promise.all(
          CHATTANOOGA_ROUTES.map((route) =>
            fetchRouteFromMapbox({
              start: route.start,
              end: route.end,
              profile: route.profile || "driving",
              token: MAPBOX_TOKEN,
            })
          )
        );

        if (cancelled) return;

        const baseStartUnix = Math.floor(Date.now() / 1000);

        const featureCollection = {
          type: "FeatureCollection",
          features: results.map((r, idx) => {
            const routeDef = CHATTANOOGA_ROUTES[idx];
            const sampled = samplePoints(r.lineCoords, 1200);

            // stagger starts so you can watch multiple trips
            const startUnix = baseStartUnix + idx * 120; // +2 minutes each route
            const durationSec = Math.max(60, Math.round(r.duration || 0));
            const endUnix = startUnix + durationSec;

            const tripCoords = toTripCoordsWithDuration(
              sampled,
              startUnix,
              durationSec
            );

            return {
              type: "Feature",
              properties: {
                vendor: routeDef.vendor,
                name: routeDef.name,
                profile: routeDef.profile || "driving",
                start_time_unix: startUnix,
                end_time_unix: endUnix,
                duration_sec: durationSec,
                distance_m: r.distance ?? null,
              },
              geometry: { type: "LineString", coordinates: tripCoords },
            };
          }),
        };

        const processed = processGeojson(featureCollection);
        const geoFieldName =
          processed?.fields?.find((f) => f.type === "geojson")?.name ||
          "_geojson";

        // compute min time so we can start the animation at the beginning
        const minStart = Math.min(
          ...featureCollection.features.map((f) => f.properties.start_time_unix)
        );

        dispatch(
          wrapTo(
            "data-layers",
            addDataToMap({
              datasets: {
                info: {
                  label: "Chattanooga Real Trip Routes",
                  id: "chattanooga-trips",
                },
                data: processed,
              },
              options: {
                centerMap: true,
                readOnly: false,
                keepExistingConfig: false,
              },
              config: {
                mapState: {
                  latitude: 35.0456,
                  longitude: -85.3097,
                  zoom: 11.5,
                  pitch: 50,
                  bearing: 0,
                },
                mapStyle: {
                  styleType: "dark",
                  visibleLayerGroups: {
                    label: true,
                    road: true,
                    border: false,
                    building: false,
                    water: true,
                    land: true,
                    "3d building": false,
                  },
                },
                visState: {
                  // ✅ layer is automatically “selected” because it’s already created+visible
                  layers: [
                    {
                      id: "chatt-trip-layer",
                      type: "trip",
                      config: {
                        dataId: "chattanooga-trips",
                        label: "Trip (Mapbox Directions)",
                        columns: { geojson: geoFieldName },
                        isVisible: true,
                        visConfig: {
                          opacity: 0.95,
                          thickness: 3,
                          trailLength: 600,
                        },
                      },
                      // ✅ color by vendor automatically
                      visualChannels: {
                        colorField: { name: "vendor", type: "string" },
                        colorScale: "ordinal",
                        sizeField: null,
                        sizeScale: "linear",
                      },
                    },
                  ],
                  interactionConfig: {
                    tooltip: {
                      fieldsToShow: {
                        "chattanooga-trips": [
                          { name: "vendor", format: null },
                          { name: "name", format: null },
                          { name: "profile", format: null },
                          { name: "duration_sec", format: null },
                          { name: "start_time_unix", format: null },
                          { name: "end_time_unix", format: null },
                          { name: "distance_m", format: null },
                        ],
                      },
                      enabled: true,
                    },
                  },
                  // ✅ auto-play: set isAnimating true and set a starting time
                  animationConfig: {
                    currentTime: minStart,
                    speed: 1,
                    isAnimating: true,
                  },
                },
              },
            })
          )
        );

        if (cancelled) return;

        setStatusMessage("");
      } catch (err) {
        console.error("❌ Error loading trips:", err);
        if (!cancelled) {
          setStatusMessage(
            `Failed to load routes: ${err?.message || String(err)}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAndPlay();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Status message only (no button) */}
      {(loading || statusMessage) && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 1000,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.65)",
            color: "white",
            fontSize: 13,
            maxWidth: 520,
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          {statusMessage || "Loading..."}
        </div>
      )}

      <KeplerGl
        id="data-layers"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}

export default DataLayersMap;
