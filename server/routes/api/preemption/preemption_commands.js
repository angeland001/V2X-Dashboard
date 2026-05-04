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

/**
 * Load the full zone config row (with signal_group and controller_ip) by id.
 * @param {number} zoneConfigId
 * @returns {Promise<Object|null>}
 */
async function loadZoneConfig(zoneConfigId) {
  // TODO: SELECT id, intersection_id, name, signal_group, controller_ip, status
  //       FROM preemption_zone_configs WHERE id = $1 LIMIT 1
  let response;
  try {
    // ... return the row as an object, or null if not found
    response = await db.query('SELECT id, intersection_id, name, signal_group, controller_ip, status FROM preemption_zone_configs WHERE id = $1 LIMIT 1', [zoneConfigId]);
  } catch (err) {
    console.error("DB error loading zone config:", err);
    throw new Error("Database error");
  }
  return response.rows[0] ?? null;
}

/**
 * Insert a new log entry and return its id.
 * @param {Object} fields  { preemption_zone_config_id, controller_adapter_id,
 *                           triggered_by, user_id, status, validator_result }
 * @returns {Promise<number>}
 */
async function createLogEntry(fields) {
  // TODO: INSERT INTO preemption_command_log (...) VALUES (...) RETURNING id
  let response;
  try {
    response = await db.query('INSERT INTO preemption_command_log (preemption_zone_config_id, controller_adapter_id, triggered_by, user_id, status, validator_result, raw_response, requested_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [fields.preemption_zone_config_id, fields.controller_adapter_id, fields.triggered_by, fields.user_id, fields.status, fields.validator_result, fields.raw_response, fields.requested_at]);
  } catch (err) {
    console.error("DB error creating log entry:", err);
    throw new Error("Database error");
  }
  return response.rows[0] ?? null;
}

/**
 * Update an existing log entry with new status and optional extra fields.
 * @param {number} logId
 * @param {Object} updates  { status, raw_command, raw_response, error_message,
 *                            sent_at, confirmed_at }
 */
async function updateLogEntry(logId, updates) {
  
  // Example: calling updateLogEntry(42, { status: 'done', completed_at: new Date() }) produces:                                                                                    
  // UPDATE preemption_command_log SET status = $1, completed_at = $2 WHERE id = $3                                                                                                 
  //-- values: ['done', <Date>, 42]             
  const keys = Object.keys(updates);
  if (keys.length === 0) return; // nothing to update

  // Build: ["col1 = $1", "col2 = $2", ...]
  const setClauses = keys.map((key,i) => `${key} = $${i + 1}`);
  const values = keys.map(k => updates[k]);

  // logId goes in as the last param ($N)
  values.push(logId);
  const whereParam = `$${values.length}`;

  const sql = `UPDATE preemption_command_command_log SET ${setClauses.join(',')} WHERE id = ${whereParam}`;
  let response;
  try {
    response = await db.query(sql, values);
  } catch {
    console.error("DB error updating log entry:", err);
    throw new Error("Database error");
  }
  return response;
}

// ── POST /api/preemption-commands ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  // Full preemption command flow:
  //
  // 1. Parse & validate request body (preemption_zone_config_id required)
  const preemptionZoneConfigId = parseId(req.body.preemption_zone_config_id);
  if (!preemptionZoneConfigId) {
    return res.status(400).json({ error: "Invalid preemption_zone_config_id" });
  }

  // 2. Load zone config — 404 if not found; 400 if status !== 'active'
  const zoneConfig = await loadZoneConfig(preemptionZoneConfigId);
  if (!zoneConfig) {
    return res.status(404).json({ error: "Preemption zone config not found"});
  } 
  if (zoneConfig.status !== 'active') {
    return res.status(400).json({error: "Preemption zone is not active"});
  }

  
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
