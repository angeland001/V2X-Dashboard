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

function normalizeConfig(config) {
  const polygonRing =
    config?.polygon?.type === "Polygon"
      ? config.polygon.coordinates?.[0] ?? null
      : config?.polygon ?? null;
  const entryCoords =
    config?.entry_line?.type === "LineString"
      ? config.entry_line.coordinates ?? null
      : config?.entry_line ?? null;
  const exitCoords =
    config?.exit_line?.type === "LineString"
      ? config.exit_line.coordinates ?? null
      : config?.exit_line ?? null;

  return {
    id: config.id,
    intersectionId: config.intersection_id,
    intersectionName: config.intersection_name,
    name: config.name,
    spatZoneId: config.spat_zone_id,
    spatZoneName: config.spat_zone_name || null,
    controllerIp: config.controller_ip || null,
    laneIds: config.lane_ids || [],
    signalGroup: config.signal_group,
    status: config.status,
    polygon: polygonRing,
    entryLine: entryCoords,
    exitLine: exitCoords,
    createdAt: config.created_at,
    updatedAt: config.updated_at,
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

  if (payload?.status !== undefined) {
    withValue(body, "status", payload.status);
  }

  if (payload?.polygon !== undefined) {
    withValue(body, "polygon", toPolygonGeoJson(payload.polygon));
  }
  if (payload?.entryLine !== undefined) {
    withValue(body, "entry_line", toLineStringGeoJson(payload.entryLine));
  } else if (payload?.entry_line !== undefined) {
    withValue(body, "entry_line", toLineStringGeoJson(payload.entry_line));
  }
  if (payload?.exitLine !== undefined) {
    withValue(body, "exit_line", toLineStringGeoJson(payload.exitLine));
  } else if (payload?.exit_line !== undefined) {
    withValue(body, "exit_line", toLineStringGeoJson(payload.exit_line));
  }

  return body;
}

/**
 * @param {string|number} intersectionId
 * @returns {Promise<Array<ReturnType<typeof normalizeConfig>>>}
 */
export async function fetchPreemptionZoneConfigs(intersectionId) {
  const url = new URL(`${API_URL}/api/preemption-zone-configs`);
  if (intersectionId != null && intersectionId !== "") {
    url.searchParams.set("intersection_id", String(intersectionId));
  }

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to load preemption zone configs (${res.status})`);
  }

  return Array.isArray(data) ? data.map(normalizeConfig) : [];
}

/**
 * @param {string|number} id
 * @returns {Promise<ReturnType<typeof normalizeConfig>>}
 */
export async function fetchPreemptionZoneConfigById(id) {
  const res = await fetch(`${API_URL}/api/preemption-zone-configs/${id}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to load preemption zone config (${res.status})`);
  }

  return normalizeConfig(data);
}

/**
 * @param {Object} payload
 * @returns {Promise<ReturnType<typeof normalizeConfig>>}
 */
export async function createPreemptionZoneConfig(payload) {
  const res = await fetch(`${API_URL}/api/preemption-zone-configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to create preemption zone config (${res.status})`);
  }

  return normalizeConfig(data);
}

/**
 * @param {string|number} id
 * @param {Object} payload
 * @returns {Promise<ReturnType<typeof normalizeConfig>>}
 */
export async function updatePreemptionZoneConfigById(id, payload) {
  const res = await fetch(`${API_URL}/api/preemption-zone-configs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to update preemption zone config (${res.status})`);
  }

  return normalizeConfig(data);
}

/**
 * @param {string|number} id
 * @returns {Promise<{message: string, id: number}>}
 */
export async function deletePreemptionZoneConfigById(id) {
  const res = await fetch(`${API_URL}/api/preemption-zone-configs/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to delete preemption zone config (${res.status})`);
  }

  return data;
}
