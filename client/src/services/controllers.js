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

import { toFiniteNumberOrNull, withValue } from "../lib/utils";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizeAdapter(row) {
  return {
    id: row.id,
    intersectionId: row.intersection_id,
    intersectionName: row.intersection_name,
    label: row.label,
    ipAddress: row.ip_address,
    snmpPort: row.snmp_port,
    snmpCommunity: row.snmp_community,
    adapterType: row.adapter_type,
    firmwareVersion: row.firmware_version,
    supportedOids: row.supported_oids,
    timeoutSeconds: row.timeout_seconds,
    retryCount: row.retry_count,
    connectionStatus: row.connection_status,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTimingConstraints(row) {
  return {
    id: row.id,
    preemptionZoneConfigId: row.preemption_zone_config_id,
    minGreenBeforePreemptS: row.min_green_before_preempt_s,
    pedWalkIntervalS: row.ped_walk_interval_s,
    pedClearanceIntervalS: row.ped_clearance_interval_s,
    yellowChangeIntervalS: row.yellow_change_interval_s,
    allRedClearanceS: row.all_red_clearance_s,
    preemptGreenHoldS: row.preempt_green_hold_s,
    maxPreemptDurationS: row.max_preempt_duration_s,
    minCallIntervalS: row.min_call_interval_s,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCommandLog(row) {
  return {
    id: row.id,
    preemptionZoneConfigId: row.preemption_zone_config_id,
    controllerAdapterId: row.controller_adapter_id,
    triggeredBy: row.triggered_by,
    userId: row.user_id,
    status: row.status,
    validatorResult: row.validator_result,
    rawCommand: row.raw_command,
    rawResponse: row.raw_response,
    errorMessage: row.error_message,
    requestedAt: row.requested_at,
    sentAt: row.sent_at,
    confirmedAt: row.confirmed_at,
  };
}

function normalizePhaseStatus(row) {
  if (!row) return null;
  return {
    signalGroup: row.signalGroup ?? null,
    raw: row.raw ?? null,
    walk: Boolean(row.walk),
    pedClear: Boolean(row.pedClear),
    minGreen: Boolean(row.minGreen),
    green: Boolean(row.green),
    yellow: Boolean(row.yellow),
    redClear: Boolean(row.redClear),
    red: Boolean(row.red),
    label: row.label ?? null,
    source: row.source ?? null,
  };
}

// ── Request body builders ─────────────────────────────────────────────────────

function buildAdapterBody(payload) {
  var body = {};

  withValue(body, "label", payload?.label);

  if (payload?.ipAddress !== undefined) {
    withValue(body, "ip_address", payload.ipAddress == null ? null : String(payload.ipAddress).trim());
  }
  if (payload?.intersectionId !== undefined) {
    withValue(body, "intersection_id", toFiniteNumberOrNull(payload.intersectionId));
  }
  if (payload?.snmpPort !== undefined) {
    withValue(body, "snmp_port", toFiniteNumberOrNull(payload.snmpPort));
  }
  if (payload?.timeoutSeconds !== undefined) {
    withValue(body, "timeout_seconds", toFiniteNumberOrNull(payload.timeoutSeconds));
  }
  if (payload?.retryCount !== undefined) {
    withValue(body, "retry_count", toFiniteNumberOrNull(payload.retryCount));
  }

  withValue(body, "snmp_community", payload?.snmpCommunity);
  withValue(body, "adapter_type", payload?.adapterType);
  withValue(body, "firmware_version", payload?.firmwareVersion);
  withValue(body, "supported_oids", payload?.supportedOids);

  return body;
}

// Converts camelCase timing constraint fields back to snake_case for POST/PUT bodies.
// Only includes keys present in the payload so partial updates don't overwrite unset fields.
function buildTimingConstraintsBody(payload) {
  var body = {};

  if (payload?.preemptionZoneConfigId !== undefined) {
    withValue(body, "preemption_zone_config_id", toFiniteNumberOrNull(payload.preemptionZoneConfigId));
  }
  if (payload?.minGreenBeforePreemptS !== undefined) {
    withValue(body, "min_green_before_preempt_s", toFiniteNumberOrNull(payload.minGreenBeforePreemptS));
  }
  if (payload?.pedWalkIntervalS !== undefined) {
    withValue(body, "ped_walk_interval_s", toFiniteNumberOrNull(payload.pedWalkIntervalS));
  }
  if (payload?.pedClearanceIntervalS !== undefined) {
    withValue(body, "ped_clearance_interval_s", toFiniteNumberOrNull(payload.pedClearanceIntervalS));
  }
  if (payload?.yellowChangeIntervalS !== undefined) {
    withValue(body, "yellow_change_interval_s", toFiniteNumberOrNull(payload.yellowChangeIntervalS));
  }
  if (payload?.allRedClearanceS !== undefined) {
    withValue(body, "all_red_clearance_s", toFiniteNumberOrNull(payload.allRedClearanceS));
  }
  if (payload?.preemptGreenHoldS !== undefined) {
    withValue(body, "preempt_green_hold_s", toFiniteNumberOrNull(payload.preemptGreenHoldS));
  }
  if (payload?.maxPreemptDurationS !== undefined) {
    withValue(body, "max_preempt_duration_s", toFiniteNumberOrNull(payload.maxPreemptDurationS));
  }
  if (payload?.minCallIntervalS !== undefined) {
    withValue(body, "min_call_interval_s", toFiniteNumberOrNull(payload.minCallIntervalS));
  }

  return body;
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

  return normalizeTimingConstraints(data);
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
