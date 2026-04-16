const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function coordsNear(a, b, eps = 1e-9) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    Math.abs(a[0] - b[0]) <= eps &&
    Math.abs(a[1] - b[1]) <= eps
  );
}

function toPolygonGeoJson(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value?.type === "Polygon") return value;
  if (!Array.isArray(value) || value.length < 3) return value;

  const ring = value.map((coord) => [coord?.[0], coord?.[1]]);
  if (!coordsNear(ring[0], ring[ring.length - 1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

function toLineStringGeoJson(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value?.type === "LineString") return value;
  if (!Array.isArray(value) || value.length < 2) return value;

  return {
    type: "LineString",
    coordinates: value.map((coord) => [coord?.[0], coord?.[1]]),
  };
}

function normalizeZone(zone) {
  const polygonRing =
    zone?.polygon?.type === "Polygon"
      ? zone.polygon.coordinates?.[0] ?? null
      : zone?.polygon ?? null;
  const entryCoords =
    zone?.entry_line?.type === "LineString"
      ? zone.entry_line.coordinates ?? null
      : zone?.entry_line ?? null;
  const exitCoords =
    zone?.exit_line?.type === "LineString"
      ? zone.exit_line.coordinates ?? null
      : zone?.exit_line ?? null;

  return {
    id: zone.id,
    intersectionId: zone.intersection_id,
    intersectionName: zone.intersection_name,
    name: zone.name,
    controllerIp: zone.controller_ip || null,
    laneIds: zone.lane_ids || [],
    signalGroup: zone.signal_group,
    status: zone.status,
    polygon: polygonRing,
    entryLine: entryCoords,
    exitLine: exitCoords,
    createdAt: zone.created_at,
    updatedAt: zone.updated_at,
  };
}

function toFiniteNumberOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function withValue(body, key, value) {
  if (value !== undefined) {
    body[key] = value;
  }
}

function buildRequestBody(payload) {
  const body = {};

  withValue(body, "name", payload?.name);

  if (payload?.intersectionId !== undefined) {
    withValue(body, "intersection_id", toFiniteNumberOrNull(payload.intersectionId));
  } else {
    withValue(body, "intersection_id", payload?.intersection_id);
  }

  if (payload?.sourceSpatZoneId !== undefined) {
    withValue(body, "source_spat_zone_id", toFiniteNumberOrNull(payload.sourceSpatZoneId));
  } else {
    withValue(body, "source_spat_zone_id", payload?.source_spat_zone_id);
  }

  if (payload?.controllerIp !== undefined) {
    withValue(body, "controller_ip", payload.controllerIp == null ? null : String(payload.controllerIp).trim());
  } else {
    withValue(body, "controller_ip", payload?.controller_ip);
  }

  if (payload?.laneIds !== undefined) {
    withValue(body, "lane_ids", payload.laneIds);
  } else {
    withValue(body, "lane_ids", payload?.lane_ids);
  }

  if (payload?.signalGroup !== undefined) {
    withValue(body, "signal_group", toFiniteNumberOrNull(payload.signalGroup));
  } else {
    withValue(body, "signal_group", payload?.signal_group);
  }

  if (payload?.polygon !== undefined) {
    withValue(body, "polygon", toPolygonGeoJson(payload.polygon));
  }
  if (payload?.entryLine !== undefined) {
    withValue(body, "entry_line", toLineStringGeoJson(payload.entryLine));
  } else {
    withValue(body, "entry_line", toLineStringGeoJson(payload?.entry_line));
  }
  if (payload?.exitLine !== undefined) {
    withValue(body, "exit_line", toLineStringGeoJson(payload.exitLine));
  } else {
    withValue(body, "exit_line", toLineStringGeoJson(payload?.exit_line));
  }

  withValue(body, "status", payload?.status);

  return body;
}

/**
 * @param {string|number|null|undefined} [intersectionId]
 * @returns {Promise<Array<{
 *   id: number,
 *   intersectionId: number,
 *   intersectionName: string,
 *   name: string,
 *   controllerIp: string|null,
 *   laneIds: number[],
 *   signalGroup: number,
 *   status: string,
 *   polygon: [number, number][]|null,
 *   entryLine: [number, number][]|null,
 *   exitLine: [number, number][]|null,
 *   createdAt: string,
 *   updatedAt: string
 * }>>}
 */
export async function fetchPreemptionZones(intersectionId) {
  const url = new URL(`${API_URL}/api/preemption-zones`);
  if (intersectionId != null && intersectionId !== "") {
    url.searchParams.set("intersection_id", String(intersectionId));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to load preemption zones (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeZone) : [];
}

/**
 * @param {string|number} id
 * @returns {Promise<ReturnType<typeof normalizeZone>>}
 */
export async function fetchPreemptionZone(id) {
  const res = await fetch(`${API_URL}/api/preemption-zones/${id}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to load preemption zone (${res.status})`);
  }

  return normalizeZone(data);
}

/**
 * @param {Object} payload
 * @returns {Promise<ReturnType<typeof normalizeZone>>}
 */
export async function createPreemptionZone(payload) {
  const res = await fetch(`${API_URL}/api/preemption-zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to create preemption zone (${res.status})`);
  }

  return normalizeZone(data);
}

/**
 * @param {string|number} id
 * @param {Object} payload
 * @returns {Promise<ReturnType<typeof normalizeZone>>}
 */
export async function updatePreemptionZone(id, payload) {
  const res = await fetch(`${API_URL}/api/preemption-zones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to update preemption zone (${res.status})`);
  }

  return normalizeZone(data);
}

/**
 * @param {string|number} id
 * @returns {Promise<{message: string, id: number}>}
 */
export async function deletePreemptionZone(id) {
  const res = await fetch(`${API_URL}/api/preemption-zones/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to delete preemption zone (${res.status})`);
  }

  return data;
}
