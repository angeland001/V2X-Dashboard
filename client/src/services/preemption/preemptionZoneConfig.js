const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function normalizeConfig(row) {
  if (!row) return null;
  return {
    intersectionId: row.intersection_id,
    spatZoneId: row.spat_zone_id,
    updatedAt: row.updated_at,
    zoneName: row.zone_name,
    laneIds: row.lane_ids || [],
    signalGroup: row.signal_group,
  };
}

/**
 * @param {string|number} intersectionId
 * @returns {Promise<{
 *   intersectionId: number,
 *   spatZoneId: number,
 *   updatedAt: string,
 *   zoneName: string,
 *   laneIds: number[],
 *   signalGroup: number
 * } | null>}
 */
export async function fetchPreemptionZoneConfig(intersectionId) {
  const res = await fetch(
    `${API_URL}/api/preemption-zone-config?intersection_id=${intersectionId}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load preemption zone config (${res.status})`);
  }
  const data = await res.json();
  return normalizeConfig(data);
}

/**
 * @param {string|number} intersectionId
 * @param {string|number|null} spatZoneId
 * @returns {Promise<{
 *   intersectionId: number,
 *   spatZoneId: number,
 *   updatedAt?: string,
 *   zoneName?: string,
 *   laneIds?: number[],
 *   signalGroup?: number
 * } | null>}
 */
export async function savePreemptionZoneConfig(intersectionId, spatZoneId) {
  const res = await fetch(`${API_URL}/api/preemption-zone-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intersection_id: Number(intersectionId),
      spat_zone_id: spatZoneId == null ? null : Number(spatZoneId),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to save preemption zone config (${res.status})`);
  }

  return normalizeConfig(data);
}
