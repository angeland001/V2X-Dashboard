const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function normalizeZone(z) {
  // Backend uses snake_case + GeoJSON geometries. Dashboard code expects
  // camelCase + raw coordinate arrays for easy Mapbox rendering.
  const polygonRing =
    z?.polygon?.type === "Polygon"
      ? z.polygon.coordinates?.[0] ?? null
      : z?.polygon ?? null;
  const entryCoords =
    z?.entry_line?.type === "LineString"
      ? z.entry_line.coordinates ?? null
      : z?.entry_line ?? null;
  const exitCoords =
    z?.exit_line?.type === "LineString"
      ? z.exit_line.coordinates ?? null
      : z?.exit_line ?? null;

  return {
    id: z.id,
    name: z.name,
    intersectionId: z.intersection_id,
    laneIds: z.lane_ids || [],
    signalGroup: z.signal_group,
    status: z.status,
    polygon: polygonRing,
    entryLine: entryCoords,
    exitLine: exitCoords,
    createdAt: z.created_at,
    updatedAt: z.updated_at,
  };
}

/**
 * @param {string|number} intersectionId
 * @returns {Promise<import("../types/spat").SpatZone[]>}
 */
export async function fetchSpatZones(intersectionId) {
  const res = await fetch(`${API_URL}/api/spat-zones?intersection_id=${intersectionId}`);
  if (!res.ok) {
    throw new Error(`Failed to load SPaT zones (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeZone) : [];
}

/**
 * @param {Object} payload
 * @returns {Promise<import("../types/spat").SpatZone>}
 */
export async function createSpatZone(payload) {
  const res = await fetch(`${API_URL}/api/spat-zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to create SPaT zone (${res.status})`);
  }
  return normalizeZone(data);
}

/**
 * @param {string|number} id
 * @param {Object} payload
 * @returns {Promise<import("../types/spat").SpatZone>}
 */
export async function updateSpatZone(id, payload) {
  const res = await fetch(`${API_URL}/api/spat-zones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to update SPaT zone (${res.status})`);
  }
  return normalizeZone(data);
}

/**
 * @param {string|number} id
 * @returns {Promise<{message: string, id: number}>}
 */
export async function deleteSpatZone(id) {
  const res = await fetch(`${API_URL}/api/spat-zones/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to delete SPaT zone (${res.status})`);
  }
  return data;
}
