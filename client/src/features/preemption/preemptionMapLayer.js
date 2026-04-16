/**
 * Mapbox source + layer plumbing for the orange "selected preemption zone"
 * overlay. Keeps all layer ids, colors, and GeoJSON shaping in one place so
 * GeoFencingMap doesn't need to know how a preemption config is drawn.
 */

export const PREEMPTION_SOURCE_ID = "preemption-zone-src";
export const PREEMPTION_FILL_LAYER_ID = "preemption-zone-fill";
export const PREEMPTION_OUTLINE_LAYER_ID = "preemption-zone-outline";

const FILL_PAINT = { "fill-color": "#F97316", "fill-opacity": 0.2 };
const OUTLINE_PAINT = { "line-color": "#FB923C", "line-width": 3 };

function ensureSource(map) {
  if (!map.getSource(PREEMPTION_SOURCE_ID)) {
    map.addSource(PREEMPTION_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
}

function ensureLayers(map) {
  if (!map.getLayer(PREEMPTION_FILL_LAYER_ID)) {
    map.addLayer({
      id: PREEMPTION_FILL_LAYER_ID,
      type: "fill",
      source: PREEMPTION_SOURCE_ID,
      paint: FILL_PAINT,
    });
  }
  if (!map.getLayer(PREEMPTION_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: PREEMPTION_OUTLINE_LAYER_ID,
      type: "line",
      source: PREEMPTION_SOURCE_ID,
      paint: OUTLINE_PAINT,
    });
  }
}

/**
 * Idempotent install of the preemption source + fill/outline layers. Safe to
 * call on initial map load and again after a style change.
 */
export function installPreemptionMapLayers(map) {
  if (!map) return;
  ensureSource(map);
  ensureLayers(map);
}

function toFeatureCollection(config) {
  if (!config?.polygon) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [config.polygon] },
        properties: { id: config.id, name: config.name },
      },
    ],
  };
}

/**
 * Push the currently-selected preemption config (or null) to the map source.
 */
export function setPreemptionSourceData(map, config) {
  if (!map) return;
  const source = map.getSource(PREEMPTION_SOURCE_ID);
  if (!source) return;
  source.setData(toFeatureCollection(config));
}
