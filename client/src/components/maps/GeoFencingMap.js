import "mapbox-gl/dist/mapbox-gl.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/shadcn/select";
import { Input } from "../ui/shadcn/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/shadcn/card";
import { Badge } from "../ui/shadcn/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/shadcn/alert-dialog";

/**
 * GeoFencingMap — V2X MapData editor
 *
 * Uses mapbox-gl (already bundled with kepler.gl) directly for the base map,
 * with manual click-based drawing for lanes (LineString) and crosswalks (Polygon).
 * 
 */

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API;
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const CHATTANOOGA_CENTER = [-85.3097, 35.0456];
const DEFAULT_ZOOM = 15;

const LANE_COLORS = {
  Vehicle: "#4B8AFF",
  Crosswalk: "#FFC832",
  Bike: "#32CD32",
  Sidewalk: "#B4B4B4",
  Parking: "#C864FF",
};

const APPROACH_COLORS = {
  Ingress: "#00C864",
  Egress: "#FF6464",
  Both: "#FFC832",
  None: "#969696",
};

const CONNECTION_COLOR = "#FF9500";

// ── Bezier helpers ──────────────────────────────────────────────
function generateBezierCurve(start, end, numPoints = 20) {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.15; // small offset to keep curves compact near center
  // Perpendicular offset for the control point
  const cpX = midX - (dy / dist) * offset;
  const cpY = midY + (dx / dist) * offset;

  const coords = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * cpX + t * t * end[0];
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * cpY + t * t * end[1];
    coords.push([x, y]);
  }
  return coords;
}

function generateArrowhead(coords, sizeDeg = 0.00002) {
  if (coords.length < 2) return null;
  const tip = coords[coords.length - 1];
  const prev = coords[coords.length - 2];
  const dx = tip[0] - prev[0];
  const dy = tip[1] - prev[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Two base points perpendicular to direction, behind the tip
  const base1 = [tip[0] - ux * sizeDeg + uy * sizeDeg * 0.5, tip[1] - uy * sizeDeg - ux * sizeDeg * 0.5];
  const base2 = [tip[0] - ux * sizeDeg - uy * sizeDeg * 0.5, tip[1] - uy * sizeDeg + ux * sizeDeg * 0.5];
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[tip, base1, base2, tip]] },
    properties: {},
  };
}

// We import mapboxgl from the copy kepler.gl ships so there's no extra install
let mapboxgl;
try {
  mapboxgl = require("mapbox-gl");
} catch {
  // fallback – shouldn't happen because kepler.gl depends on it
  console.error("mapbox-gl not found");
}

function GeoFencingMap() {
  // ── Refs ──────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapLoadedRef = useRef(false);

  // ── State ─────────────────────────────────────────────────────
  const [mapStyle, setMapStyle] = useState("satellite-streets"); // "satellite-streets" | "dark"
  const [intersections, setIntersections] = useState([]);
  const [activeIntersection, setActiveIntersection] = useState(null);
  const [showNewIntersection, setShowNewIntersection] = useState(false);
  const [newIntName, setNewIntName] = useState("");
  const [newIntId, setNewIntId] = useState("");
  const [placingIntersection, setPlacingIntersection] = useState(null); // { name, intersection_id }

  const [lanes, setLanes] = useState([]);
  const [crosswalks, setCrosswalks] = useState([]);
  const [connections, setConnections] = useState([]);

  // Drawing: null | "lane" | "crosswalk" | "connection"
  const [drawMode, setDrawMode] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const [connectionFrom, setConnectionFrom] = useState(null);

  // Config panel after drawing or right-click
  const [configPanel, setConfigPanel] = useState(null);

  // Confirm intersection dialog
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [mapDataResult, setMapDataResult] = useState(null);

  // Toast
  const [message, setMessage] = useState(null);

  // Keep refs in sync for mapbox event handlers
  const drawModeRef = useRef(null);
  const drawPointsRef = useRef([]);
  const activeIntRef = useRef(null);
  const connectionFromRef = useRef(null);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { drawPointsRef.current = drawPoints; }, [drawPoints]);
  useEffect(() => { activeIntRef.current = activeIntersection; }, [activeIntersection]);
  useEffect(() => { connectionFromRef.current = connectionFrom; }, [connectionFrom]);

  // ── Toast helper ──────────────────────────────────────────────
  const showMessage = useCallback((text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // ── Data loading ──────────────────────────────────────────────
  const loadIntersections = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/intersections`);
      const data = await res.json();
      setIntersections(data);
    } catch (err) {
      console.error("Failed to load intersections:", err);
    }
  }, []);

  const loadLanes = useCallback(async (intId) => {
    try {
      const res = await fetch(`${API_URL}/api/lanes?intersection_id=${intId}`);
      setLanes(await res.json());
    } catch (err) {
      console.error("Failed to load lanes:", err);
    }
  }, []);

  const loadCrosswalks = useCallback(async (intId) => {
    try {
      const res = await fetch(`${API_URL}/api/crosswalks?intersection_id=${intId}`);
      setCrosswalks(await res.json());
    } catch (err) {
      console.error("Failed to load crosswalks:", err);
    }
  }, []);

  const loadConnections = useCallback(async (intId) => {
    try {
      const res = await fetch(`${API_URL}/api/lane-connections?intersection_id=${intId}`);
      setConnections(await res.json());
    } catch (err) {
      console.error("Failed to load connections:", err);
    }
  }, []);

  useEffect(() => { loadIntersections(); }, [loadIntersections]);

  useEffect(() => {
    if (activeIntersection) {
      loadLanes(activeIntersection.id);
      loadCrosswalks(activeIntersection.id);
      loadConnections(activeIntersection.id);
    } else {
      setLanes([]);
      setCrosswalks([]);
      setConnections([]);
    }
  }, [activeIntersection, loadLanes, loadCrosswalks, loadConnections]);

  // ── Initialize Mapbox ─────────────────────────────────────────
  useEffect(() => {
    if (!mapboxgl || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: CHATTANOOGA_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      mapLoadedRef.current = true;
      mapRef.current = map;

      // ── Sources ────────────────────────────────────
      map.addSource("lanes-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("crosswalks-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("draw-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("intersections-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("phase-labels-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("connections-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("connection-arrows-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── Layers ─────────────────────────────────────
      map.addLayer({
        id: "crosswalks-fill",
        type: "fill",
        source: "crosswalks-src",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "crosswalks-outline",
        type: "line",
        source: "crosswalks-src",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
        },
      });
      map.addLayer({
        id: "lanes-line",
        type: "line",
        source: "lanes-src",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw-src",
        paint: {
          "line-color": "#ffffff",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw-src",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.1,
        },
        filter: ["==", "$type", "Polygon"],
      });
      map.addLayer({
        id: "draw-points",
        type: "circle",
        source: "draw-src",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#000000",
        },
        filter: ["==", "$type", "Point"],
      });
      map.addLayer({
        id: "intersections-points",
        type: "circle",
        source: "intersections-src",
        paint: {
          "circle-radius": 10,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "intersections-labels",
        type: "symbol",
        source: "intersections-src",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, 1.5],
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });
      map.addLayer({
        id: "phase-labels",
        type: "symbol",
        source: "phase-labels-src",
        layout: {
          "text-field": ["get", "phase"],
          "text-size": 13,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.8)",
          "text-halo-width": 2,
        },
      });
      map.addLayer({
        id: "connections-line",
        type: "line",
        source: "connections-src",
        paint: {
          "line-color": CONNECTION_COLOR,
          "line-width": 2,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
      map.addLayer({
        id: "connection-arrows-fill",
        type: "fill",
        source: "connection-arrows-src",
        paint: {
          "fill-color": CONNECTION_COLOR,
          "fill-opacity": 0.9,
        },
      });

      // ── Click handler for drawing ──────────────────
      map.on("click", (e) => {
        const mode = drawModeRef.current;
        if (!mode) return;

        if (mode === "connection") {
          // Pick a lane feature under the click
          const features = map.queryRenderedFeatures(e.point, { layers: ["lanes-line"] });
          if (features.length === 0) return;
          const laneId = features[0].properties.id;
          const from = connectionFromRef.current;
          if (!from) {
            setConnectionFrom(laneId);
          } else {
            if (laneId === from) return; // ignore clicking same lane
            createConnection(from, laneId);
            setConnectionFrom(null);
          }
          return;
        }

        const point = [e.lngLat.lng, e.lngLat.lat];
        const newPoints = [...drawPointsRef.current, point];
        setDrawPoints(newPoints);
        updateDrawSource(map, newPoints, mode);
      });

      // ── Double-click to finish drawing ─────────────
      map.on("dblclick", (e) => {
        const mode = drawModeRef.current;
        if (!mode) return;

        e.preventDefault();
        const pts = drawPointsRef.current;

        if (mode === "lane" && pts.length >= 2) {
          finishDrawing(pts, "lane");
        } else if (mode === "crosswalk" && pts.length >= 3) {
          // Close the polygon
          const closedPts = [...pts, pts[0]];
          finishDrawing(closedPts, "crosswalk");
        }
      });

      // ── Right-click on lanes/crosswalks to edit ────
      map.on("contextmenu", "lanes-line", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        if (feature) {
          const props = feature.properties;
          setConfigPanel({
            type: "lane-edit",
            laneId: props.id,
            values: {
              lane_type: props.lane_type,
              phase: props.phase != null && props.phase !== "null" ? String(props.phase) : "",
              name: props.name && props.name !== "null" ? props.name : "",
            },
          });
        }
      });

      map.on("contextmenu", "crosswalks-fill", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        if (feature) {
          const props = feature.properties;
          setConfigPanel({
            type: "crosswalk-edit",
            crosswalkId: props.id,
            values: {
              approach_type: props.approach_type,
              approach_id: props.approach_id != null && props.approach_id !== "null" ? String(props.approach_id) : "1",
              name: props.name && props.name !== "null" ? props.name : "",
            },
          });
        }
      });

      map.on("contextmenu", "connections-line", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        if (feature) {
          const props = feature.properties;
          setConfigPanel({
            type: "connection-edit",
            connectionId: props.id,
            values: {
              signal_group: props.signal_group != null && props.signal_group !== "null" ? String(props.signal_group) : "",
            },
          });
        }
      });

      // Cursor changes
      map.on("mouseenter", "lanes-line", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "lanes-line", () => { map.getCanvas().style.cursor = drawModeRef.current ? "crosshair" : ""; });
      map.on("mouseenter", "crosswalks-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "crosswalks-fill", () => { map.getCanvas().style.cursor = drawModeRef.current ? "crosshair" : ""; });
      map.on("mouseenter", "connections-line", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "connections-line", () => { map.getCanvas().style.cursor = drawModeRef.current ? "crosshair" : ""; });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: add all custom sources & layers to the map ─────────
  const addSourcesAndLayers = useCallback((map) => {
    if (!map.getSource("lanes-src")) {
      map.addSource("lanes-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("crosswalks-src")) {
      map.addSource("crosswalks-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("draw-src")) {
      map.addSource("draw-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("intersections-src")) {
      map.addSource("intersections-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("phase-labels-src")) {
      map.addSource("phase-labels-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("connections-src")) {
      map.addSource("connections-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getSource("connection-arrows-src")) {
      map.addSource("connection-arrows-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }

    if (!map.getLayer("crosswalks-fill")) {
      map.addLayer({ id: "crosswalks-fill", type: "fill", source: "crosswalks-src", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.25 } });
    }
    if (!map.getLayer("crosswalks-outline")) {
      map.addLayer({ id: "crosswalks-outline", type: "line", source: "crosswalks-src", paint: { "line-color": ["get", "color"], "line-width": 2 } });
    }
    if (!map.getLayer("lanes-line")) {
      map.addLayer({ id: "lanes-line", type: "line", source: "lanes-src", paint: { "line-color": ["get", "color"], "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } });
    }
    if (!map.getLayer("draw-line")) {
      map.addLayer({ id: "draw-line", type: "line", source: "draw-src", paint: { "line-color": "#ffffff", "line-width": 3, "line-dasharray": [2, 2] } });
    }
    if (!map.getLayer("draw-fill")) {
      map.addLayer({ id: "draw-fill", type: "fill", source: "draw-src", paint: { "fill-color": "#ffffff", "fill-opacity": 0.1 }, filter: ["==", "$type", "Polygon"] });
    }
    if (!map.getLayer("draw-points")) {
      map.addLayer({ id: "draw-points", type: "circle", source: "draw-src", paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-width": 2, "circle-stroke-color": "#000000" }, filter: ["==", "$type", "Point"] });
    }
    if (!map.getLayer("intersections-points")) {
      map.addLayer({ id: "intersections-points", type: "circle", source: "intersections-src", paint: { "circle-radius": 10, "circle-color": ["get", "color"], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
    }
    if (!map.getLayer("intersections-labels")) {
      map.addLayer({ id: "intersections-labels", type: "symbol", source: "intersections-src", layout: { "text-field": ["get", "name"], "text-offset": [0, 1.5], "text-size": 11 }, paint: { "text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1 } });
    }
    if (!map.getLayer("phase-labels")) {
      map.addLayer({ id: "phase-labels", type: "symbol", source: "phase-labels-src", layout: { "text-field": ["get", "phase"], "text-size": 13, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.8)", "text-halo-width": 2 } });
    }
    if (!map.getLayer("connections-line")) {
      map.addLayer({ id: "connections-line", type: "line", source: "connections-src", paint: { "line-color": CONNECTION_COLOR, "line-width": 2 }, layout: { "line-cap": "round", "line-join": "round" } });
    }
    if (!map.getLayer("connection-arrows-fill")) {
      map.addLayer({ id: "connection-arrows-fill", type: "fill", source: "connection-arrows-src", paint: { "fill-color": CONNECTION_COLOR, "fill-opacity": 0.9 } });
    }
  }, []);

  // ── Switch map style ──────────────────────────────────────────
  const mapStyleRef = useRef(mapStyle);
  useEffect(() => { mapStyleRef.current = mapStyle; }, [mapStyle]);

  const toggleMapStyle = useCallback(() => {
    setMapStyle((prev) => (prev === "satellite-streets" ? "dark" : "satellite-streets"));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const styleUrl = mapStyle === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/satellite-streets-v12";

    map.setStyle(styleUrl);

    const onStyleLoad = () => {
      addSourcesAndLayers(map);

      // Re-populate data
      const laneFeatures = lanes.map((l) => ({
        type: "Feature", geometry: l.geometry,
        properties: { id: l.id, lane_type: l.lane_type, phase: l.phase, name: l.name, color: LANE_COLORS[l.lane_type] || "#cccccc" },
      }));
      const laneSrc = map.getSource("lanes-src");
      if (laneSrc) laneSrc.setData({ type: "FeatureCollection", features: laneFeatures });

      const phaseFeatures = lanes
        .filter((l) => l.phase != null && l.geometry?.coordinates?.length >= 1)
        .map((l) => {
          const coords = l.geometry.coordinates;
          const endCoord = coords[coords.length - 1];
          return { type: "Feature", geometry: { type: "Point", coordinates: endCoord }, properties: { phase: String(l.phase) } };
        });
      const phaseSrc = map.getSource("phase-labels-src");
      if (phaseSrc) phaseSrc.setData({ type: "FeatureCollection", features: phaseFeatures });

      const cwFeatures = crosswalks.map((c) => ({
        type: "Feature", geometry: c.geometry,
        properties: { id: c.id, approach_type: c.approach_type, approach_id: c.approach_id, name: c.name, color: APPROACH_COLORS[c.approach_type] || "#cccccc" },
      }));
      const cwSrc = map.getSource("crosswalks-src");
      if (cwSrc) cwSrc.setData({ type: "FeatureCollection", features: cwFeatures });

      const intFeatures = intersections
        .filter((i) => i.ref_point?.coordinates)
        .map((i) => ({
          type: "Feature", geometry: i.ref_point,
          properties: { id: i.id, name: i.name, status: i.status, color: i.id === activeIntRef.current?.id ? "#FFC800" : i.status === "confirmed" ? "#00C864" : "#6496FF" },
        }));
      const intSrc = map.getSource("intersections-src");
      if (intSrc) intSrc.setData({ type: "FeatureCollection", features: intFeatures });

      // Re-populate connection data
      updateConnectionSources(map, connections, lanes);
    };

    map.once("style.load", onStyleLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle, addSourcesAndLayers]);

  // ── Update map data when lanes/crosswalks/intersections change ─
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    const map = mapRef.current;

    // Lanes
    const laneFeatures = lanes.map((l) => ({
      type: "Feature",
      geometry: l.geometry,
      properties: {
        id: l.id,
        lane_type: l.lane_type,
        phase: l.phase,
        name: l.name,
        color: LANE_COLORS[l.lane_type] || "#cccccc",
      },
    }));
    const laneSrc = map.getSource("lanes-src");
    if (laneSrc) laneSrc.setData({ type: "FeatureCollection", features: laneFeatures });

    // Phase labels (point at the last coordinate of each lane that has a phase)
    const phaseFeatures = lanes
      .filter((l) => l.phase != null && l.geometry?.coordinates?.length >= 1)
      .map((l) => {
        const coords = l.geometry.coordinates;
        const endCoord = coords[coords.length - 1];
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: endCoord },
          properties: { phase: String(l.phase) },
        };
      });
    const phaseSrc = map.getSource("phase-labels-src");
    if (phaseSrc) phaseSrc.setData({ type: "FeatureCollection", features: phaseFeatures });

    // Crosswalks
    const cwFeatures = crosswalks.map((c) => ({
      type: "Feature",
      geometry: c.geometry,
      properties: {
        id: c.id,
        approach_type: c.approach_type,
        approach_id: c.approach_id,
        name: c.name,
        color: APPROACH_COLORS[c.approach_type] || "#cccccc",
      },
    }));
    const cwSrc = map.getSource("crosswalks-src");
    if (cwSrc) cwSrc.setData({ type: "FeatureCollection", features: cwFeatures });
  }, [lanes, crosswalks]);

  // Update connection curves — uses lane endpoint (last coord, same as phase label)
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    updateConnectionSources(mapRef.current, connections, lanes);
  }, [connections, lanes]);

  function updateConnectionSources(map, conns, laneList) {
    // Build a lookup: lane id → last coordinate (where the phase label sits)
    const laneEndpoints = {};
    laneList.forEach((l) => {
      const coords = l.geometry?.coordinates;
      if (coords && coords.length > 0) {
        laneEndpoints[l.id] = coords[coords.length - 1];
      }
    });

    const lineFeatures = [];
    const arrowFeatures = [];
    conns.forEach((conn) => {
      const start = laneEndpoints[conn.from_lane_id];
      const end = laneEndpoints[conn.to_lane_id];
      if (!start || !end) return;

      const curveCoords = generateBezierCurve(start, end);
      lineFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: curveCoords },
        properties: { id: conn.id, from_lane_id: conn.from_lane_id, to_lane_id: conn.to_lane_id, signal_group: conn.signal_group },
      });
      const arrow = generateArrowhead(curveCoords);
      if (arrow) {
        arrow.properties = { id: conn.id };
        arrowFeatures.push(arrow);
      }
    });
    const connSrc = map.getSource("connections-src");
    if (connSrc) connSrc.setData({ type: "FeatureCollection", features: lineFeatures });
    const arrowSrc = map.getSource("connection-arrows-src");
    if (arrowSrc) arrowSrc.setData({ type: "FeatureCollection", features: arrowFeatures });
  }

  // Update intersection markers
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    const map = mapRef.current;

    const features = intersections
      .filter((i) => i.ref_point?.coordinates)
      .map((i) => ({
        type: "Feature",
        geometry: i.ref_point,
        properties: {
          id: i.id,
          name: i.name,
          status: i.status,
          color: i.id === activeIntersection?.id
            ? "#FFC800"
            : i.status === "confirmed" ? "#00C864" : "#6496FF",
        },
      }));
    const src = map.getSource("intersections-src");
    if (src) src.setData({ type: "FeatureCollection", features });
  }, [intersections, activeIntersection]);

  // Fly to intersection on select
  useEffect(() => {
    if (!mapRef.current || !activeIntersection?.ref_point?.coordinates) return;
    const [lng, lat] = activeIntersection.ref_point.coordinates;
    mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 1000 });
  }, [activeIntersection]);

  // Update cursor when draw mode changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getCanvas().style.cursor = drawMode ? "crosshair" : "";
    // Disable double-click zoom while drawing
    if (drawMode) {
      mapRef.current.doubleClickZoom.disable();
    } else {
      mapRef.current.doubleClickZoom.enable();
    }
  }, [drawMode]);

  // ── Drawing helpers ───────────────────────────────────────────
  function updateDrawSource(map, points, mode) {
    const src = map.getSource("draw-src");
    if (!src) return;

    const features = [];

    // Points
    points.forEach((p) => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: {},
      });
    });

    // Line / polygon preview
    if (points.length >= 2) {
      if (mode === "crosswalk") {
        // Show as polygon preview (close the ring)
        const ring = [...points, points[0]];
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ring] },
          properties: {},
        });
      } else {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: points },
          properties: {},
        });
      }
    }

    src.setData({ type: "FeatureCollection", features });
  }

  function clearDrawSource() {
    if (!mapRef.current) return;
    const src = mapRef.current.getSource("draw-src");
    if (src) src.setData({ type: "FeatureCollection", features: [] });
  }

  function finishDrawing(points, mode) {
    let geometry;
    if (mode === "lane") {
      geometry = { type: "LineString", coordinates: points };
    } else {
      geometry = { type: "Polygon", coordinates: [points] };
    }

    const defaultValues =
      mode === "lane"
        ? { lane_type: "Vehicle", phase: "", name: "" }
        : { approach_type: "Both", approach_id: "1", name: "" };

    setConfigPanel({
      type: mode,
      feature: { geometry },
      values: defaultValues,
    });

    setDrawMode(null);
    setDrawPoints([]);
    clearDrawSource();
  }

  // ── Drawing actions ───────────────────────────────────────────
  const startDrawLane = () => {
    if (!activeIntersection) {
      showMessage("Select or create an intersection first.", "error");
      return;
    }
    setConfigPanel(null);
    setDrawPoints([]);
    clearDrawSource();
    setDrawMode("lane");
    showMessage("Click to place lane points. Double-click to finish.", "info");
  };

  const startDrawCrosswalk = () => {
    if (!activeIntersection) {
      showMessage("Select or create an intersection first.", "error");
      return;
    }
    setConfigPanel(null);
    setDrawPoints([]);
    clearDrawSource();
    setDrawMode("crosswalk");
    showMessage("Click to place approach vertices. Double-click to close.", "info");
  };

  const startDrawConnection = () => {
    if (!activeIntersection) {
      showMessage("Select or create an intersection first.", "error");
      return;
    }
    if (lanes.length < 2) {
      showMessage("You need at least 2 lanes to create a connection.", "error");
      return;
    }
    setConfigPanel(null);
    setDrawPoints([]);
    clearDrawSource();
    setConnectionFrom(null);
    setDrawMode("connection");
    showMessage("Click a FROM lane, then click a TO lane.", "info");
  };

  const createConnection = async (fromLaneId, toLaneId) => {
    try {
      const res = await fetch(`${API_URL}/api/lane-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_lane_id: fromLaneId, to_lane_id: toLaneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const intId = activeIntRef.current?.id;
      if (intId) await loadConnections(intId);
      showMessage("Connection created.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  const deleteConnection = async (connId) => {
    try {
      const res = await fetch(`${API_URL}/api/lane-connections/${connId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfigPanel(null);
      const intId = activeIntRef.current?.id;
      if (intId) await loadConnections(intId);
      showMessage("Connection deleted.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  const updateConnectionSignalGroup = async () => {
    // The API only has POST/DELETE, so we delete and recreate isn't ideal.
    // For signal_group edits we just show the panel — but the current API doesn't have PUT.
    // We'll skip this for now since signal_group can be set at creation time.
    setConfigPanel(null);
  };

  const cancelDraw = () => {
    setDrawMode(null);
    setDrawPoints([]);
    setConnectionFrom(null);
    clearDrawSource();
  };

  // ── Create intersection ───────────────────────────────────────
  const beginPlacingIntersection = () => {
    if (!newIntName.trim() || !newIntId) return;
    setPlacingIntersection({
      name: newIntName.trim(),
      intersection_id: parseInt(newIntId),
    });
    setShowNewIntersection(false);
    setNewIntName("");
    setNewIntId("");
    showMessage("Pan the map to position the intersection reference point, then click Confirm.");
  };

  const confirmPlacement = async () => {
    if (!placingIntersection) return;
    try {
      const map = mapRef.current;
      const center = map ? map.getCenter() : { lng: CHATTANOOGA_CENTER[0], lat: CHATTANOOGA_CENTER[1] };
      const refPoint = { type: "Point", coordinates: [center.lng, center.lat] };
      const res = await fetch(`${API_URL}/api/intersections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: placingIntersection.name,
          intersection_id: placingIntersection.intersection_id,
          ref_point: refPoint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlacingIntersection(null);
      await loadIntersections();
      setActiveIntersection(data);
      showMessage("Intersection created. Draw lanes and approaches, then confirm.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  const cancelPlacement = () => {
    setPlacingIntersection(null);
  };

  // ── Confirm intersection ──────────────────────────────────────
  const confirmIntersection = async () => {
    if (!activeIntersection) return;
    try {
      const res = await fetch(`${API_URL}/api/intersections/${activeIntersection.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMapDataResult(data.mapData);
      setConfirmDialog(false);
      await loadIntersections();
      setActiveIntersection((prev) => prev ? { ...prev, status: "confirmed" } : null);
      showMessage("Intersection confirmed. MapData exported.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Delete intersection ───────────────────────────────────────
  const deleteIntersection = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/intersections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      if (activeIntersection?.id === id) setActiveIntersection(null);
      await loadIntersections();
      showMessage("Intersection deleted.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Save new lane ─────────────────────────────────────────────
  const saveLane = async () => {
    if (!configPanel || configPanel.type !== "lane") return;
    try {
      const { feature, values } = configPanel;
      const res = await fetch(`${API_URL}/api/lanes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intersection_id: activeIntersection.id,
          geometry: feature.geometry,
          lane_type: values.lane_type,
          phase: values.phase ? parseInt(values.phase) : null,
          name: values.name || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfigPanel(null);
      await loadLanes(activeIntersection.id);
      showMessage("Lane saved.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Save new crosswalk ────────────────────────────────────────
  const saveCrosswalk = async () => {
    if (!configPanel || configPanel.type !== "crosswalk") return;
    try {
      const { feature, values } = configPanel;
      const res = await fetch(`${API_URL}/api/crosswalks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intersection_id: activeIntersection.id,
          geometry: feature.geometry,
          approach_type: values.approach_type,
          approach_id: values.approach_id ? parseInt(values.approach_id) : null,
          name: values.name || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfigPanel(null);
      await loadCrosswalks(activeIntersection.id);
      showMessage("Approach saved.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Update existing lane ──────────────────────────────────────
  const updateLane = async () => {
    if (!configPanel || configPanel.type !== "lane-edit") return;
    try {
      const { laneId, values } = configPanel;
      const res = await fetch(`${API_URL}/api/lanes/${laneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane_type: values.lane_type,
          phase: values.phase ? parseInt(values.phase) : null,
          name: values.name || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfigPanel(null);
      await loadLanes(activeIntersection.id);
      showMessage("Lane updated.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  const deleteLane = async (laneId) => {
    try {
      const res = await fetch(`${API_URL}/api/lanes/${laneId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfigPanel(null);
      await loadLanes(activeIntersection.id);
      showMessage("Lane deleted.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Update existing crosswalk ─────────────────────────────────
  const updateCrosswalk = async () => {
    if (!configPanel || configPanel.type !== "crosswalk-edit") return;
    try {
      const { crosswalkId, values } = configPanel;
      const res = await fetch(`${API_URL}/api/crosswalks/${crosswalkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach_type: values.approach_type,
          approach_id: values.approach_id ? parseInt(values.approach_id) : null,
          name: values.name || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfigPanel(null);
      await loadCrosswalks(activeIntersection.id);
      showMessage("Approach updated.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  const deleteCrosswalk = async (cwId) => {
    try {
      const res = await fetch(`${API_URL}/api/crosswalks/${cwId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfigPanel(null);
      await loadCrosswalks(activeIntersection.id);
      showMessage("Approach deleted.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }} onContextMenu={(e) => e.preventDefault()}>
      {/* Mapbox container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Top-Left Control Panel ─────────────────────────────── */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
        {/* Intersection selector */}
        <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-white">Intersection</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <Select
              value={activeIntersection ? String(activeIntersection.id) : ""}
              onValueChange={(val) => {
                if (val === "__new__") {
                  setShowNewIntersection(true);
                } else {
                  const int = intersections.find((i) => String(i.id) === val);
                  setActiveIntersection(int || null);
                }
              }}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-xs h-8">
                <SelectValue placeholder="Select intersection..." />
              </SelectTrigger>
              <SelectContent className="dark bg-zinc-800 border-zinc-600">
                {intersections.map((int) => (
                  <SelectItem key={int.id} value={String(int.id)} className="text-white text-xs">
                    {int.name} ({int.status})
                  </SelectItem>
                ))}
                <SelectItem value="__new__" className="text-blue-400 text-xs">
                  + New Intersection
                </SelectItem>
              </SelectContent>
            </Select>
            {activeIntersection && (
              <div className="flex items-center gap-1">
                <Badge className={activeIntersection.status === "confirmed" ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"}>
                  {activeIntersection.status}
                </Badge>
                <span className="text-xs text-zinc-400 ml-1">ID: {activeIntersection.intersection_id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawing actions */}
        {activeIntersection && (
          <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm text-white">Draw</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex gap-2">
                <Button size="sm" className={drawMode === "lane" ? "flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700" : "flex-1 text-xs h-8 bg-zinc-800 text-white border border-zinc-600 hover:bg-zinc-700"} onClick={drawMode === "lane" ? cancelDraw : startDrawLane}>
                  {drawMode === "lane" ? "Cancel" : "Draw Lane"}
                </Button>
                <Button size="sm" className={drawMode === "crosswalk" ? "flex-1 text-xs h-8 bg-yellow-600 hover:bg-yellow-700" : "flex-1 text-xs h-8 bg-zinc-800 text-white border border-zinc-600 hover:bg-zinc-700"} onClick={drawMode === "crosswalk" ? cancelDraw : startDrawCrosswalk}>
                  {drawMode === "crosswalk" ? "Cancel" : "Draw Approach"}
                </Button>
              </div>
              <Button size="sm" className={drawMode === "connection" ? "w-full text-xs h-8 bg-orange-600 hover:bg-orange-700" : "w-full text-xs h-8 bg-zinc-800 text-white border border-zinc-600 hover:bg-zinc-700"} onClick={drawMode === "connection" ? cancelDraw : startDrawConnection}>
                {drawMode === "connection" ? "Cancel" : "Connect Lanes"}
              </Button>
              {drawMode && (
                <p className="text-xs text-zinc-400">
                  {drawMode === "lane" ? "Click to place points. Double-click to finish."
                    : drawMode === "crosswalk" ? "Click to place approach vertices. Double-click to close."
                    : drawMode === "connection" && !connectionFrom ? "Click the FROM lane."
                    : drawMode === "connection" && connectionFrom ? "Now click the TO lane."
                    : ""}
                </p>
              )}
              <div className="text-xs text-zinc-400 space-y-0.5">
                <div>Lanes: {lanes.length}</div>
                <div>Approaches: {crosswalks.length}</div>
                <div>Connections: {connections.length}</div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirmDialog(true)}>
                  {activeIntersection.status === "confirmed" ? "Re-export" : "Confirm & Export"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 bg-red-600/10 text-red-400 border-red-500/30 hover:bg-red-600/20" onClick={() => deleteIntersection(activeIntersection.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-zinc-400">Legend</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(LANE_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-3 h-1 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-zinc-300">{name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded-full" style={{ backgroundColor: CONNECTION_COLOR }} />
                <span className="text-zinc-300">Connection</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── New Intersection Dialog ────────────────────────────── */}
      <AlertDialog open={showNewIntersection} onOpenChange={setShowNewIntersection}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">New Intersection</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              After clicking Create, you will place the reference point on the map.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Name</label>
              <Input value={newIntName} onChange={(e) => setNewIntName(e.target.value)} placeholder="e.g. MLK & Georgia" className="bg-zinc-800 border-zinc-700 text-white text-sm" autoFocus />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Intersection ID (integer)</label>
              <Input type="number" value={newIntId} onChange={(e) => setNewIntId(e.target.value)} placeholder="e.g. 1001" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={beginPlacingIntersection} className="bg-blue-600 text-white hover:bg-blue-700" disabled={!newIntName.trim() || !newIntId}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Intersection Dialog ────────────────────────── */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Intersection?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will mark "{activeIntersection?.name}" as confirmed and generate the SAE J2735 MapData JSON export.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-xs text-zinc-400 py-1">Lanes: {lanes.length} | Approaches: {crosswalks.length} | Connections: {connections.length}</div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmIntersection} className="bg-green-600 text-white hover:bg-green-700">Confirm & Export</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Lane Config Panel ──────────────────────────────────── */}
      {configPanel && (configPanel.type === "lane" || configPanel.type === "lane-edit") && (
        <div style={{ position: "absolute", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 20 }}>
          <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur w-72">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-white">{configPanel.type === "lane" ? "Configure Lane" : "Edit Lane"}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name (optional)</label>
                <Input value={configPanel.values.name} onChange={(e) => setConfigPanel((p) => ({ ...p, values: { ...p.values, name: e.target.value } }))} placeholder="Lane name" className="bg-zinc-800 border-zinc-700 text-white text-sm h-8" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Lane Type</label>
                <Select value={configPanel.values.lane_type} onValueChange={(val) => setConfigPanel((p) => ({ ...p, values: { ...p.values, lane_type: val } }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {["Vehicle", "Crosswalk", "Bike", "Sidewalk", "Parking"].map((t) => (
                      <SelectItem key={t} value={t} className="text-white text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Phase (integer)</label>
                <Input type="number" value={configPanel.values.phase} onChange={(e) => setConfigPanel((p) => ({ ...p, values: { ...p.values, phase: e.target.value } }))} placeholder="Signal phase" className="bg-zinc-800 border-zinc-700 text-white text-sm h-8" />
              </div>
            </CardContent>
            <CardFooter className="px-4 pb-4 flex gap-2">
              {configPanel.type === "lane" ? (
                <>
                  <Button size="sm" className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={saveLane}>Save Lane</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={() => setConfigPanel(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={updateLane}>Update</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-red-600/10 text-red-400 border-red-500/30 hover:bg-red-600/20" onClick={() => deleteLane(configPanel.laneId)}>Delete</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={() => setConfigPanel(null)}>Close</Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── Crosswalk Config Panel ─────────────────────────────── */}
      {configPanel && (configPanel.type === "crosswalk" || configPanel.type === "crosswalk-edit") && (
        <div style={{ position: "absolute", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 20 }}>
          <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur w-72">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-white">{configPanel.type === "crosswalk" ? "Configure Approach" : "Edit Approach"}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name (optional)</label>
                <Input value={configPanel.values.name} onChange={(e) => setConfigPanel((p) => ({ ...p, values: { ...p.values, name: e.target.value } }))} placeholder="Approach name" className="bg-zinc-800 border-zinc-700 text-white text-sm h-8" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Approach Type</label>
                <Select value={configPanel.values.approach_type} onValueChange={(val) => setConfigPanel((p) => ({ ...p, values: { ...p.values, approach_type: val } }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {["Ingress", "Egress", "Both", "None"].map((t) => (
                      <SelectItem key={t} value={t} className="text-white text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Approach ID</label>
                <Select value={configPanel.values.approach_id} onValueChange={(val) => setConfigPanel((p) => ({ ...p, values: { ...p.values, approach_id: val } }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-white text-xs">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="px-4 pb-4 flex gap-2">
              {configPanel.type === "crosswalk" ? (
                <>
                  <Button size="sm" className="flex-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white" onClick={saveCrosswalk}>Save Approach</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={() => setConfigPanel(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" className="flex-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white" onClick={updateCrosswalk}>Update</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-red-600/10 text-red-400 border-red-500/30 hover:bg-red-600/20" onClick={() => deleteCrosswalk(configPanel.crosswalkId)}>Delete</Button>
                  <Button size="sm" variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={() => setConfigPanel(null)}>Close</Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── Connection Edit Panel ──────────────────────────────── */}
      {configPanel && configPanel.type === "connection-edit" && (
        <div style={{ position: "absolute", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 20 }}>
          <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur w-72">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-white">Edit Connection</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Signal Group (optional)</label>
                <Input type="number" value={configPanel.values.signal_group} onChange={(e) => setConfigPanel((p) => ({ ...p, values: { ...p.values, signal_group: e.target.value } }))} placeholder="Signal group" className="bg-zinc-800 border-zinc-700 text-white text-sm h-8" />
              </div>
            </CardContent>
            <CardFooter className="px-4 pb-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs bg-red-600/10 text-red-400 border-red-500/30 hover:bg-red-600/20" onClick={() => deleteConnection(configPanel.connectionId)}>Delete</Button>
              <Button size="sm" variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={() => setConfigPanel(null)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── MapData JSON viewer ────────────────────────────────── */}
      {mapDataResult && (
        <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 20, maxWidth: 480, maxHeight: 400 }}>
          <Card className="dark bg-zinc-900/95 border-zinc-700 backdrop-blur">
            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white">MapData Export</CardTitle>
              <Button size="sm" variant="ghost" className="text-xs text-zinc-400 hover:text-white h-6 px-2" onClick={() => setMapDataResult(null)}>Close</Button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <pre className="text-xs text-zinc-300 bg-zinc-800 rounded p-3 overflow-auto max-h-72 whitespace-pre-wrap">
                {JSON.stringify(mapDataResult, null, 2)}
              </pre>
              <Button size="sm" className="mt-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-white w-full" onClick={() => { navigator.clipboard.writeText(JSON.stringify(mapDataResult, null, 2)); showMessage("Copied to clipboard."); }}>
                Copy JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Placement Mode Overlay ───────────────────────────── */}
      {placingIntersection && (
        <>
          {/* Crosshair at map center */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 15,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <line x1="24" y1="0" x2="24" y2="20" stroke="#FFC800" strokeWidth="2" />
              <line x1="24" y1="28" x2="24" y2="48" stroke="#FFC800" strokeWidth="2" />
              <line x1="0" y1="24" x2="20" y2="24" stroke="#FFC800" strokeWidth="2" />
              <line x1="28" y1="24" x2="48" y2="24" stroke="#FFC800" strokeWidth="2" />
              <circle cx="24" cy="24" r="6" stroke="#FFC800" strokeWidth="2" fill="none" />
            </svg>
          </div>
          {/* Instruction bar + buttons */}
          <div style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div className="px-4 py-2.5 rounded-lg text-sm border backdrop-blur bg-zinc-900/95 text-white border-zinc-600/50 flex items-center gap-3">
              <span>Pan to position the reference point for <strong>{placingIntersection.name}</strong></span>
              <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white" onClick={confirmPlacement}>
                Confirm Placement
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700" onClick={cancelPlacement}>
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Map Style Toggle (top-right) ────────────────────────── */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 20 }}>
        <Button
          size="sm"
          className="text-xs h-8 px-3 bg-zinc-900/90 text-white border border-zinc-600 hover:bg-zinc-700 backdrop-blur"
          onClick={toggleMapStyle}
        >
          {mapStyle === "satellite-streets" ? "Dark Mode" : "Satellite"}
        </Button>
      </div>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {message && (
        <div style={{ position: "absolute", top: 56, right: 16, zIndex: 30, maxWidth: 350 }}>
          <div className={`px-4 py-2.5 rounded-lg text-sm border backdrop-blur ${message.type === "error" ? "bg-red-500/90 text-white border-red-400/50" : "bg-zinc-800/90 text-white border-zinc-600/50"}`}>
            {message.text}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeoFencingMap;
