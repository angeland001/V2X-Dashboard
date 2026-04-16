import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const INTERSECTIONS = [
  { id: "MLK_Georgia", name: "MLK & Georgia" },
  { id: "MLK_Lindsay", name: "MLK & Lindsay" },
];

const EMPTY_GEOJSON = { type: "FeatureCollection", features: [] };

export default function SDSMEventsMap() {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const mapReadyRef     = useRef(false);   // true once 'load' has fired
  const pendingRef      = useRef(null);    // geojson queued before map loaded
  const intervalRef     = useRef(null);
  const updateCountRef  = useRef(0);

  const [updateCount,          setUpdateCount]          = useState(0);
  const [eventCount,           setEventCount]           = useState(0);
  const [statusMessage,        setStatusMessage]        = useState("Loading SDSM events…");
  const [refreshRate,          setRefreshRate]          = useState(100);
  const [selectedIntersection, setSelectedIntersection] = useState("all");

  // ── hide page scrollbar while mounted ─────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  // ── boot mapbox once ───────────────────────────────────────────────────────
  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     "mapbox://styles/mapbox/dark-v11",
      center:    [-85.3097, 35.0456],
      zoom:      16,
      pitch:     45,
      bearing:   0,
    });
    mapRef.current = map;

    map.on("load", () => {
      // GeoJSON source — updated in-place on every fetch
      map.addSource("sdsm", {
        type: "geojson",
        data: EMPTY_GEOJSON,
      });

      // Circle layer — color and radius driven by feature properties
      map.addLayer({
        id:     "sdsm-circles",
        type:   "circle",
        source: "sdsm",
        paint: {
          // green = vehicle, red = everything else (VRU / pedestrian)
          "circle-color": [
            "match",
            ["get", "type"],
            "vehicle", "#00FF00",
            "#FF0000",
          ],
          // radius grows with speed (px)
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "speed"],
            0,  6,
            30, 20,
          ],
          "circle-opacity":       0.9,
          "circle-stroke-color":  "#FFFFFF",
          "circle-stroke-width":  1.5,
        },
      });

      mapReadyRef.current = true;

      // Apply any data that arrived before the map finished loading
      if (pendingRef.current) {
        map.getSource("sdsm").setData(pendingRef.current);
        pendingRef.current = null;
      }
    });

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── push geojson into the map source ──────────────────────────────────────
  const pushToMap = useCallback((geojson) => {
    if (mapReadyRef.current && mapRef.current) {
      mapRef.current.getSource("sdsm").setData(geojson);
    } else {
      // Map still loading — stash it; the 'load' handler will apply it
      pendingRef.current = geojson;
    }
  }, []);

  // ── fetch SDSM data ────────────────────────────────────────────────────────
  const fetchSDSMData = useCallback(async () => {
    try {
      updateCountRef.current += 1;
      setUpdateCount(updateCountRef.current);

      let allObjects = [];

      if (selectedIntersection === "all") {
        const results = await Promise.all(
          INTERSECTIONS.map(async ({ id }) => {
            try {
              const res = await fetch(`${API_URL}/api/sdsm/latest/${id}`);
              return res.ok ? res.json() : null;
            } catch { return null; }
          })
        );
        allObjects = results
          .filter(Boolean)
          .flatMap((r) =>
            r.objects.map((obj) => ({
              ...obj,
              intersectionID: r.intersectionID,
              intersection:   r.intersection,
              timestamp:      r.timestamp,
            }))
          );
      } else {
        const res = await fetch(
          `${API_URL}/api/sdsm/latest/${selectedIntersection}`
        );
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        allObjects = json.objects || [];
      }

      if (allObjects.length === 0) {
        setStatusMessage("No active objects detected");
        setEventCount(0);
        pushToMap(EMPTY_GEOJSON);
        return;
      }

      const geojson = {
        type: "FeatureCollection",
        features: allObjects.map((obj) => {
          const [latitude, longitude] = obj.location.coordinates;
          return {
            type: "Feature",
            geometry: {
              type:        "Point",
              coordinates: [longitude, latitude],
            },
            properties: {
              type:  obj.type.toLowerCase(),
              speed: obj.speed || 0,
            },
          };
        }),
      };

      pushToMap(geojson);
      setEventCount(allObjects.length);
      setStatusMessage("");
    } catch (err) {
      console.error("SDSM fetch error:", err);
      setStatusMessage(`Error: ${err.message}`);
      setEventCount(0);
    }
  }, [selectedIntersection, pushToMap]);

  // ── auto-refresh ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSDSMData();
    intervalRef.current = setInterval(fetchSDSMData, refreshRate);
    return () => clearInterval(intervalRef.current);
  }, [fetchSDSMData, refreshRate]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* Control panel */}
      <Card className="absolute top-5 right-5 z-[1000] min-w-[300px] bg-black/85 text-white border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">SDSM Events</CardTitle>
          <CardDescription className="text-gray-400 text-xs">
            Real-time vehicle and VRU tracking
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="rounded-md bg-white/10 p-3 space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Active Objects:</span>
              <span className="font-bold text-green-500">{eventCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Refresh Rate:</span>
              <span className="font-bold">{refreshRate / 1000}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Updates:</span>
              <span className="font-bold text-blue-400">{updateCount}</span>
            </div>
          </div>

          {/* Intersection selector */}
          <div className="space-y-2">
            <Label htmlFor="intersection" className="text-xs text-gray-300">
              Intersection
            </Label>
            <select
              id="intersection"
              value={selectedIntersection}
              onChange={(e) => setSelectedIntersection(e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Intersections</option>
              {INTERSECTIONS.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Refresh rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="refresh-rate" className="text-xs text-gray-300">
                Refresh Rate
              </Label>
              <span className="text-xs font-medium">{refreshRate / 1000}s</span>
            </div>
            <Slider
              id="refresh-rate"
              min={100}
              max={10000}
              step={500}
              value={[refreshRate]}
              onValueChange={(v) => setRefreshRate(v[0])}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0.1s</span>
              <span>10s</span>
            </div>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div className="rounded-md bg-orange-500/20 p-3 text-xs text-orange-200">
              {statusMessage}
            </div>
          )}

          {/* Legend */}
          <div className="pt-4 border-t border-white/20 space-y-3">
            <p className="text-xs font-semibold">Legend</p>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
              <span className="text-xs text-gray-300">Vehicle</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
              <span className="text-xs text-gray-300">VRU / Pedestrian</span>
            </div>
            <p className="text-[10px] text-gray-500">* Size indicates speed</p>
          </div>
        </CardContent>
      </Card>

      {/* Map fills the entire container */}
      <div
        ref={mapContainerRef}
        style={{ position: "absolute", inset: 0 }}
      />
    </div>
  );
}
