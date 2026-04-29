/**
 * Preemption Command API
 *
 * Validates, issues, and tracks preemption commands to physical controllers.
 * Every command is logged to preemption_command_log for audit and MUTCD compliance.
 *
 * Routes:
 *   POST /api/preemption-commands                      trigger a preemption call
 *   POST /api/preemption-commands/:logId/clear         clear an active preemption call
 *   GET  /api/preemption-commands/log                  command history (filterable)
 *   GET  /api/preemption-commands/log/:logId           single log entry
 *   GET  /api/preemption-commands/status/:zoneConfigId live preemption status for a zone
 *
 * POST /api/preemption-commands body:
 *   {
 *     preemption_zone_config_id: number,   // which zone to preempt
 *     triggered_by: "operator"|"api"|"scheduler",
 *     user_id: number (optional)
 *   }
 *
 * The command lifecycle is:
 *   pending → validated → sent → confirmed
 *                      ↘ failed
 *               ↘ rejected  (validator blocked it)
 *
 * All state transitions are written to preemption_command_log so the
 * dashboard can show real-time status and operators can audit history.
 */

const express = require("express");
const router  = express.Router();
const db      = require("../../../database/postgis");
const { ControllerClientFactory } = require("../../../services/controllerClient");
const {
  PreemptionValidator,
  loadTimingConstraints,
  loadAdapterForZoneConfig,
} = require("../../../services/preemptionValidator");

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Load the full zone config row (with signal_group and controller_ip) by id.
 * @param {number} zoneConfigId
 * @returns {Promise<Object|null>}
 */
async function loadZoneConfig(zoneConfigId) {
  // TODO: SELECT id, intersection_id, name, signal_group, controller_ip, status
  //       FROM preemption_zone_configs WHERE id = $1 LIMIT 1
}

/**
 * Insert a new log entry and return its id.
 * @param {Object} fields  { preemption_zone_config_id, controller_adapter_id,
 *                           triggered_by, user_id, status, validator_result }
 * @returns {Promise<number>}
 */
async function createLogEntry(fields) {
  // TODO: INSERT INTO preemption_command_log (...) VALUES (...) RETURNING id
}

/**
 * Update an existing log entry with new status and optional extra fields.
 * @param {number} logId
 * @param {Object} updates  { status, raw_command, raw_response, error_message,
 *                            sent_at, confirmed_at }
 */
async function updateLogEntry(logId, updates) {
  // HINT: build a dynamic SET clause — only include keys that are present in updates
  // TODO: UPDATE preemption_command_log SET ... WHERE id = $N
}

// ── POST /api/preemption-commands ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  // Full preemption command flow:
  //
  // 1. Parse & validate request body (preemption_zone_config_id required)
  // 2. Load zone config — 404 if not found; 400 if status !== 'active'
  // 3. Load controller adapter for this zone (via controller_ip join)
  //    If no adapter row exists, fall back to ControllerClientFactory.forIp(controller_ip)
  //    so the system still works for zones with a raw IP but no adapter record yet
  // 4. Create a log entry with status='pending'
  // 5. Load timing constraints — use DB row if it exists, else sensible defaults
  // 6. Run PreemptionValidator.validate(signalGroup)
  // 7a. If NOT approved: update log to status='rejected', validator_result=result
  //     return 422 { approved: false, violations, warnings, logId }
  // 7b. If approved:
  //     - update log to status='validated'
  //     - client.sendPreemptionCall(signalGroup)
  //     - update log to status='sent', raw_command=..., sent_at=NOW()
  //     - (optional) attempt a follow-up getPreemptionStatus() to confirm
  //     - update log to status='confirmed', confirmed_at=NOW()
  //     - return 200 { approved: true, warnings, logId, phaseState }
  //
  // On any SNMP/network error after validation:
  //   - update log to status='failed', error_message=err.message
  //   - return 502 { error: "Controller unreachable", logId }
  //
  // Always call client.close() in a finally block.
  //
  // TODO: implement
});

// ── POST /api/preemption-commands/:logId/clear ────────────────────────────────
router.post("/:logId/clear", async (req, res) => {
  // Clear an active preemption call.
  //
  // 1. Load the original log entry by logId — 404 if not found
  // 2. Load the zone config from the log entry
  // 3. Load adapter and build client
  // 4. client.clearPreemptionCall(signalGroup)
  // 5. Insert a new log entry with status='sent' for the clear operation
  //    (triggered_by = 'operator', raw_command = 'CLEAR')
  // 6. Return 200 { cleared: true, logId: newLogId }
  //
  // TODO: implement
});

// ── GET /api/preemption-commands/log ─────────────────────────────────────────
router.get("/log", async (req, res) => {
  // Returns paginated command history.
  //
  // Query params (all optional):
  //   zone_config_id  — filter by preemption zone config
  //   intersection_id — filter via join through preemption_zone_configs
  //   status          — filter by command status
  //   limit           — default 50, max 200
  //   offset          — default 0
  //
  // HINT: JOIN preemption_command_log with preemption_zone_configs to get
  //       zone name, and with controller_adapters to get adapter label.
  //       Order by requested_at DESC.
  //
  // TODO: implement
});

// ── GET /api/preemption-commands/log/:logId ───────────────────────────────────
router.get("/log/:logId", async (req, res) => {
  // TODO: fetch single log entry with the same joins as the list endpoint
  //       return 404 if not found
});

// ── GET /api/preemption-commands/status/:zoneConfigId ────────────────────────
router.get("/status/:zoneConfigId", async (req, res) => {
  // Returns live preemption status for a zone by querying the controller directly.
  // Also returns the most recent log entry for UI display.
  //
  // HINT:
  //   1. Load zone config + adapter
  //   2. client.getPreemptionStatus()
  //   3. SELECT most recent log entry for this zoneConfigId
  //   4. Return { liveStatus, lastCommand }
  //
  // TODO: implement
});

module.exports = router;
