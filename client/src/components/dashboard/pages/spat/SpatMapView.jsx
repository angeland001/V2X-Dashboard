import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { createPortal } from "react-dom";
import { SpatSignalMarker } from "./SpatSignalMarker";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * INTERSECTION_COORDS — Map coordinates for each traffic signal
 *
 * ⚠️  THESE ARE PLACEHOLDER VALUES — Replace with real [longitude, latitude] pairs
 *
 * Format: { "CUIP_SLUG": [longitude, latitude] }
 * Example: "MLK_Broad": [-83.6324, 32.8401]  ← MLK Blvd & Broad St
 *
 * To update, provide real GeoJSON coordinates for each intersection and
 * replace the values below. The map will center on the first coordinate.
 */
export const INTERSECTION_COORDS = {
  MLK_Broad: [-85.310463184189523, 35.04575493193856],
  MLK_Central: [-85.2921110467991, 35.03979556697864], 
  MLK_Chestnut: [-85.2890, 35.0380],
  MLK_Douglas: [-85.30281660309237, 35.04377587036413],
  MLK_Georgia: [-85.30827034132932, 35.04577974317704],
  MLK_Houston: [-85.30553436359072, 35.04475892400736],
  MLK_Lindsay: [-85.30689713818381, 35.0452697472294],
  MLK_Magnolia: [-85.2962208237581, 35.041316605664804],
  MLK_Market: [-85.30942438362325, 35.045775512978146],  
  MLK_Peeples: [-85.29880078245992, 35.04231012546289],
  MLK_Pine: [-85.3125372245956, 35.046044193426745],
  Lab_Device: [-85.30896231157749, 35.043620429391545], 
};

const DEFAULT_CENTER = [-85.2895, 35.0450];
const DEFAULT_ZOOM = 14;

export function SpatMapView({ selectedSlug, onSelect }) {
  const containerRef = useRef(null);
  const [markerElements, setMarkerElements] = useState({});
  const mapInstanceRef = useRef(null);

  // Initialize map and markers
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 30,
      bearing: 0,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      const markers = {};
      // Create marker DOM elements and attach to map
      Object.entries(INTERSECTION_COORDS).forEach(([slug, [lng, lat]]) => {
        const el = document.createElement("div");
        el.className = "spat-marker-container";

        new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);

        markers[slug] = el;
      });
      // Update state to trigger portal rendering
      setMarkerElements(markers);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Mapbox container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* React portals for each marker */}
      {Object.entries(markerElements).map(([slug, element]) =>
        createPortal(
          <SpatSignalMarker
            key={slug}
            cuipSlug={slug}
            selected={selectedSlug === slug}
            onSelect={onSelect}
          />,
          element
        )
      )}
    </div>
  );
}
