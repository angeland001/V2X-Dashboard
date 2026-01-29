import React, { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API

const LANE_COLORS = {
  Vehicle: "#4B8AFF",
  Crosswalk: "#FFC832",
  Bike: "#32CD32",
  Sidewalk: "#B4B4B4",
  Parking: "#C864FF",
}

const APPROACH_COLORS = {
  Ingress: "#00C864",
  Egress: "#FF6464",
  Both: "#FFC832",
  None: "#969696",
}

export default function IntersectionPreviewMap({ center, lanes = [], crosswalks = [], zoom = 17, className = "" }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || !center) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    })

    mapRef.current = map

    map.on("load", () => {
      // Lanes
      const laneFeatures = lanes.map((l) => ({
        type: "Feature",
        geometry: l.geometry,
        properties: {
          color: LANE_COLORS[l.lane_type] || "#cccccc",
        },
      }))
      map.addSource("lanes-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: laneFeatures },
      })
      map.addLayer({
        id: "lanes-line",
        type: "line",
        source: "lanes-src",
        paint: { "line-color": ["get", "color"], "line-width": 3 },
        layout: { "line-cap": "round", "line-join": "round" },
      })

      // Crosswalks
      const cwFeatures = crosswalks.map((cw) => ({
        type: "Feature",
        geometry: cw.geometry,
        properties: {
          color: APPROACH_COLORS[cw.approach_type] || "#FFC832",
        },
      }))
      map.addSource("crosswalks-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: cwFeatures },
      })
      map.addLayer({
        id: "crosswalks-fill",
        type: "fill",
        source: "crosswalks-src",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 },
      })
      map.addLayer({
        id: "crosswalks-outline",
        type: "line",
        source: "crosswalks-src",
        paint: { "line-color": ["get", "color"], "line-width": 2 },
      })

      // Intersection ref point
      map.addSource("ref-point-src", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: center },
              properties: {},
            },
          ],
        },
      })
      map.addLayer({
        id: "ref-point",
        type: "circle",
        source: "ref-point-src",
        paint: {
          "circle-radius": 6,
          "circle-color": "#FF4444",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Fit bounds if there are features
      if (laneFeatures.length > 0 || cwFeatures.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend(center)
        laneFeatures.forEach((f) => {
          f.geometry.coordinates.forEach((c) => bounds.extend(c))
        })
        cwFeatures.forEach((f) => {
          const coords = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates
          coords.forEach((c) => bounds.extend(c))
        })
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 30, maxZoom: 18, duration: 0 })
        }
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [center, lanes, crosswalks, zoom])

  if (!MAPBOX_TOKEN || !center) {
    return (
      <div className={`bg-zinc-900 flex items-center justify-center text-zinc-600 text-sm ${className}`}>
        No preview available
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
