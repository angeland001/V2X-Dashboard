/**
 * Frontend service layer for the Controller Adapter and Preemption Command APIs.
 *
 * All functions return camelCase-normalised objects so components never
 * need to know about the snake_case DB column names.
 *
 * Follows the same pattern as preemptionZoneConfigs.js:
 *   - normalise* converts a raw API row to a clean frontend shape
 *   - buildAdapterBody / buildCommandBody convert frontend payloads back to snake_case
 */

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizeAdapter(row) {
  
  // Keys to map:
  //   id, intersection_id → intersectionId, intersection_name → intersectionName,
  //   label, ip_address → ipAddress, snmp_port → snmpPort,
  //   snmp_community → snmpCommunity, adapter_type → adapterType,
  //   firmware_version → firmwareVersion, supported_oids → supportedOids,
  //   timeout_seconds → timeoutSeconds, retry_count → retryCount,
  //   connection_status → connectionStatus, last_seen_at → lastSeenAt,
  //   created_at → createdAt, updated_at → updatedAt
  return {
    id: row.id,
    intersectionId: row.intersection_id,
    intersectionName: row.intersection_name,
    label: row.label,
    ipAddress: row.ip_address,

  }

}

function normalizeTimingConstraints(row) {
  // TODO: map all snake_case fields to camelCase
  // Keys to map:
  //   id, preemption_zone_config_id → preemptionZoneConfigId,
  //   min_green_before_preempt_s → minGreenBeforePreemptS,
  //   ped_walk_interval_s → pedWalkIntervalS,
  //   ped_clearance_interval_s → pedClearanceIntervalS,
  //   yellow_change_interval_s → yellowChangeIntervalS,
  //   all_red_clearance_s → allRedClearanceS,
  //   preempt_green_hold_s → preemptGreenHoldS,
  //   max_preempt_duration_s → maxPreemptDurationS,
  //   min_call_interval_s → minCallIntervalS,
  //   created_at → createdAt, updated_at → updatedAt
}

function normalizeCommandLog(row) {
  // TODO: map snake_case to camelCase
  // Keys to map:
  //   id, preemption_zone_config_id → preemptionZoneConfigId,
  //   controller_adapter_id → controllerAdapterId,
  //   triggered_by → triggeredBy, user_id → userId,
  //   status, validator_result → validatorResult,
  //   raw_command → rawCommand, raw_response → rawResponse,
  //   error_message → errorMessage,
  //   requested_at → requestedAt, sent_at → sentAt, confirmed_at → confirmedAt
}

function normalizePhaseStatus(row) {
  // TODO: row is already camelCase-ish from the server but normalise for safety
  // Expected keys: signalGroup, raw, walk, pedClear, minGreen, green,
  //                yellow, redClear, red, label, source
}

// ── Request body builders ─────────────────────────────────────────────────────

function buildAdapterBody(payload) {
  // TODO: convert camelCase payload keys back to snake_case for the API
  // Only include keys that are actually present in the payload (use `in` check)
  // HINT: follow the same withValue / body pattern from preemptionZoneConfigs.js
}

function buildTimingConstraintsBody(payload) {
  // TODO: convert camelCase timing constraint fields to snake_case
}

// ── Controller Adapter CRUD ───────────────────────────────────────────────────

/**
 * @param {string|number} [intersectionId]  Optional filter
 * @returns {Promise<Array>}
 */
export async function fetchControllerAdapters(intersectionId) {
  const url = new URL(`${API_URL}/api/controllers`);
  if (intersectionId != null && intersectionId !== "") {
    url.searchParams.set("intersection_id", String(intersectionId));
  }

  const res  = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to load controllers (${res.status})`);

  return Array.isArray(data) ? data.map(normalizeAdapter) : [];
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchControllerAdapterById(id) {
  const res  = await fetch(`${API_URL}/api/controllers/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to load controller (${res.status})`);

  return normalizeAdapter(data);
}

/**
 * @param {Object} payload  camelCase fields (intersectionId, ipAddress, adapterType, …)
 * @returns {Promise<Object>}
 */
export async function createControllerAdapter(payload) {
  const res = await fetch(`${API_URL}/api/controllers`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(buildAdapterBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to create controller (${res.status})`);

  return normalizeAdapter(data);
}

/**
 * @param {string|number} id
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateControllerAdapter(id, payload) {
  const res = await fetch(`${API_URL}/api/controllers/${id}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(buildAdapterBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to update controller (${res.status})`);

  return normalizeAdapter(data);
}

/**
 * @param {string|number} id
 */
export async function deleteControllerAdapter(id) {
  const res  = await fetch(`${API_URL}/api/controllers/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to delete controller (${res.status})`);

  return data;
}

// ── Controller Live Reads ─────────────────────────────────────────────────────

/**
 * Live SNMP probe — updates firmware_version, supported_oids, last_seen_at.
 * @param {string|number} id  controller_adapters row id
 * @returns {Promise<Object>}  normalised adapter with updated fields
 */
export async function probeControllerAdapter(id) {
  const res  = await fetch(`${API_URL}/api/controllers/${id}/probe`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Probe failed (${res.status})`);

  return normalizeAdapter(data);
}

/**
 * Live phase status from the controller for one signal group.
 * @param {string|number} adapterId
 * @param {number} signalGroup
 * @returns {Promise<Object>}  { signalGroup, green, yellow, red, walk, pedClear, label, source }
 */
export async function fetchLivePhaseStatus(adapterId, signalGroup) {
  const res  = await fetch(`${API_URL}/api/controllers/${adapterId}/phase/${signalGroup}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Phase read failed (${res.status})`);

  return normalizePhaseStatus(data);
}

/**
 * Live timing parameters from the controller for one signal group.
 * @param {string|number} adapterId
 * @param {number} signalGroup
 * @returns {Promise<Object>}  timing values in seconds
 */
export async function fetchLiveTimingParameters(adapterId, signalGroup) {
  const res  = await fetch(`${API_URL}/api/controllers/${adapterId}/timings/${signalGroup}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Timing read failed (${res.status})`);

  // TODO: normalise the response (all values already in seconds from server)
  return data;
}

// ── Timing Constraints CRUD ───────────────────────────────────────────────────
// These operate on controller_timing_constraints via the controllers route
// using the preemption_zone_config_id as the key.

/**
 * @param {string|number} preemptionZoneConfigId
 * @returns {Promise<Object|null>}
 */
export async function fetchTimingConstraints(preemptionZoneConfigId) {
  const url = new URL(`${API_URL}/api/controllers/timing-constraints`);
  url.searchParams.set("preemption_zone_config_id", String(preemptionZoneConfigId));

  const res  = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to load timing constraints (${res.status})`);

  return data ? normalizeTimingConstraints(data) : null;
}

/**
 * @param {Object} payload  camelCase timing constraint fields including preemptionZoneConfigId
 * @returns {Promise<Object>}
 */
export async function upsertTimingConstraints(payload) {
  // Uses PUT (upsert) — server creates if no row exists, updates if it does
  const res = await fetch(`${API_URL}/api/controllers/timing-constraints`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(buildTimingConstraintsBody(payload)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to save timing constraints (${res.status})`);

  return normalizeTimingConstraints(data);
}

// ── Preemption Commands ───────────────────────────────────────────────────────

/**
 * Trigger a preemption command for a zone.  The server runs the validator
 * first and returns either approval (200) or rejection (422).
 *
 * @param {Object} payload  { preemptionZoneConfigId, triggeredBy, userId? }
 * @returns {Promise<Object>}  { approved, violations, warnings, logId, phaseState? }
 */
export async function triggerPreemption(payload) {
  const res = await fetch(`${API_URL}/api/preemption-commands`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      preemption_zone_config_id: payload.preemptionZoneConfigId,
      triggered_by:              payload.triggeredBy || "operator",
      user_id:                   payload.userId ?? null,
    }),
  });
  const data = await res.json();

  // 422 = validator rejected — not a network error, return the result
  if (res.status === 422) return { approved: false, ...data };
  if (!res.ok) throw new Error(data.error || `Preemption command failed (${res.status})`);

  return data;
}

/**
 * Clear an active preemption call.
 * @param {string|number} logId  id from preemption_command_log
 */
export async function clearPreemption(logId) {
  const res  = await fetch(`${API_URL}/api/preemption-commands/${logId}/clear`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Clear failed (${res.status})`);

  return data;
}

/**
 * Fetch command log entries.
 * @param {Object} [filters]  { zoneConfigId, intersectionId, status, limit, offset }
 * @returns {Promise<Array>}
 */
export async function fetchPreemptionCommandLog(filters = {}) {
  const url = new URL(`${API_URL}/api/preemption-commands/log`);
  if (filters.zoneConfigId)   url.searchParams.set("zone_config_id",  String(filters.zoneConfigId));
  if (filters.intersectionId) url.searchParams.set("intersection_id", String(filters.intersectionId));
  if (filters.status)         url.searchParams.set("status",          filters.status);
  if (filters.limit)          url.searchParams.set("limit",           String(filters.limit));
  if (filters.offset)         url.searchParams.set("offset",          String(filters.offset));

  const res  = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to load command log (${res.status})`);

  return Array.isArray(data) ? data.map(normalizeCommandLog) : [];
}

/**
 * Live preemption status for a zone (queries controller directly).
 * @param {string|number} zoneConfigId
 * @returns {Promise<Object>}  { liveStatus, lastCommand }
 */
export async function fetchPreemptionStatus(zoneConfigId) {
  const res  = await fetch(`${API_URL}/api/preemption-commands/status/${zoneConfigId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Status read failed (${res.status})`);

  return {
    liveStatus:  data.liveStatus,
    lastCommand: data.lastCommand ? normalizeCommandLog(data.lastCommand) : null,
  };
}
