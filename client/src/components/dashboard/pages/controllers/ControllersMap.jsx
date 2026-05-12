import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API;
const API_URL      = process.env.REACT_APP_API_URL || "http://localhost:3001";

const STATUS_COLOR = {
  active:      "#22c55e",
  offline:     "#ef4444",
  maintenance: "#eab308",
};

function makeMarkerEl(color) {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `width:14px;height:14px;cursor:pointer`;

  const dot = document.createElement("div");
  dot.style.cssText = [
    `width: 14px`,
    `height: 14px`,
    `border-radius: 50%`,
    `background-color: ${color}`,
    `border: 2px solid white`,
    `box-shadow: 0 0 6px rgba(0,0,0,0.6)`,
    `transition: transform 0.15s`,
  ].join(";");

  // Scale the inner dot on hover so Mapbox's positioning transform on the wrapper is untouched
  wrapper.addEventListener("mouseenter", () => { dot.style.transform = "scale(1.4)"; });
  wrapper.addEventListener("mouseleave", () => { dot.style.transform = "scale(1)"; });

  wrapper.appendChild(dot);
  return wrapper;
}

export function ControllersMap({ controllers, onSelectController }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markersRef    = useRef([]);
  const popupRef      = useRef(null);
  const [mapReady, setMapReady]   = useState(false);
  const [coordCache, setCoordCache] = useState({});

  // Fetch intersection coordinates for all unique intersection IDs
  useEffect(() => {
    const ids = [...new Set(controllers.map((c) => c.intersectionId).filter(Boolean))];
    const missing = ids.filter((id) => !(id in coordCache));
    if (!missing.length) return;

    Promise.all(
      missing.map((id) =>
        fetch(`${API_URL}/api/intersections/${id}`)
          .then((r) => r.json())
          .then((data) => {
            const geo = data?.ref_point;
            if (!geo) return [id, null];
            // ref_point may come as GeoJSON or as { lat, lng }
            let lng, lat;
            if (geo.type === "Point") {
              [lng, lat] = geo.coordinates;
            } else if (geo.lng !== undefined) {
              lng = geo.lng; lat = geo.lat;
            } else {
              return [id, null];
            }
            return [id, [lng, lat]];
          })
          .catch(() => [id, null])
      )
    ).then((entries) => {
      const updates = {};
      for (const [id, coords] of entries) updates[id] = coords;
      setCoordCache((prev) => ({ ...prev, ...updates }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllers]);

  // Strip Mapbox's default popup chrome for our custom popup class
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .mapbox-controller-popup .mapboxgl-popup-content {
        background: transparent;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
      }
      .mapbox-controller-popup .mapboxgl-popup-tip { display: none; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container:        containerRef.current,
      style:            "mapbox://styles/mapbox/dark-v11",
      center:           [-85.3097, 35.0456], // Chattanooga default
      zoom:             12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever controllers or coordinates change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Remove old markers + popup
    for (const { marker, popup } of markersRef.current) {
      popup?.remove();
      marker.remove();
    }
    markersRef.current = [];
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;

    for (const adapter of controllers) {
      const coords = coordCache[adapter.intersectionId];
      if (!coords) continue;

      const [lng, lat] = coords;
      bounds.extend([lng, lat]);
      hasPoint = true;

      const color  = STATUS_COLOR[adapter.connectionStatus] ?? "#9ca3af";
      const el     = makeMarkerEl(color);

      const popup = new mapboxgl.Popup({
        offset: 12, closeButton: false, closeOnClick: false,
        className: "mapbox-controller-popup",
      }).setHTML(`
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:8px 10px;font-size:11px;color:#e5e5e5;min-width:140px">
          <div style="font-weight:600;margin-bottom:2px">${adapter.label || adapter.ipAddress}</div>
          <div style="color:#888">${adapter.ipAddress}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:4px">
            <span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block"></span>
            <span style="text-transform:capitalize;color:#bbb">${adapter.connectionStatus}</span>
          </div>
        </div>
      `);

      el.addEventListener("mouseenter", () => {
        popup.setLngLat([lng, lat]).addTo(mapRef.current);
        popupRef.current = popup;
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
        if (popupRef.current === popup) popupRef.current = null;
      });
      el.addEventListener("click", () => onSelectController(adapter));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      markersRef.current.push({ marker, popup });
    }

    if (hasPoint && markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
    }
  }, [mapReady, controllers, coordCache, onSelectController]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-neutral-900 text-neutral-600">
        <MapPin className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">Mapbox token not configured</p>
        <p className="text-xs mt-1">Set REACT_APP_MAPBOX_API in your .env file</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {controllers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-neutral-900/80 rounded-lg px-4 py-3 text-center">
            <MapPin className="h-6 w-6 text-neutral-500 mx-auto mb-1" />
            <p className="text-sm text-neutral-400">No controllers configured</p>
          </div>
        </div>
      )}
    </div>
  );
}
