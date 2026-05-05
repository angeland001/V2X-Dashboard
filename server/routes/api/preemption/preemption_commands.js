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
  
  let response;
  try {
    response = await db.query('INSERT INTO preemption_command_log (preemption_zone_config_id, controller_adapter_id, triggered_by, user_id, status, validator_result, raw_command, raw_response, requested_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [fields.preemption_zone_config_id, fields.controller_adapter_id, fields.triggered_by, fields.user_id, fields.status, fields.validator_result, fields.raw_command ?? null, fields.raw_response ?? null, fields.requested_at]);
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

  const sql = `UPDATE preemption_command_log SET ${setClauses.join(',')} WHERE id = ${whereParam}`;
  let response;
  try {
    response = await db.query(sql, values);
  } catch (err) {
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
  let adapter;
  let adapterRow = await loadAdapterForZoneConfig(preemptionZoneConfigId);
  if (adapterRow) {
     adapter = ControllerClientFactory.forAdapter(adapterRow);
  } else {
    adapter = ControllerClientFactory.forIp(zoneConfig.controller_ip);
  }

  // 4. Create a log entry with status='pending'
  const logEntry = await createLogEntry({
    preemption_zone_config_id: preemptionZoneConfigId,
    controller_adapter_id: adapterRow ? adapterRow.id : null,
    triggered_by: req.body.triggered_by || 'operator',
    user_id: req.body.user_id || null,
    status: 'pending',
    validator_result: null,
    raw_response: null,
    requested_at: new Date(),
  });
  if (!logEntry) return res.status(500).json({ error: "Failed to create log entry" });
  const logId = logEntry.id;



  // 5. Load timing constraints — use DB row if it exists, else sensible defaults
  const constraints = await loadTimingConstraints(preemptionZoneConfigId) || {
    ped_walk_interval_s: 7,
    ped_clearance_interval_s: 3,
    min_green_before_preempt_s: 10,
    min_call_interval_s: 30,
    yellow_change_interval_s: 3,
    all_red_clearance_s: 2,
  };

  // 6. Run PreemptionValidator.validate(signalGroup)
  

  // 7. If approved, send the preemption call to the controller and update log accordingly:
  let validationResult;
  // 7a. If NOT approved: update log to status='rejected', validator_result=result
  //     return 422 { approved: false, violations, warnings, logId }

  const validator = new PreemptionValidator(adapter, constraints);                                                                                                               
  try {
    validationResult = await validator.validate(zoneConfig.signal_group);
  } catch (err) {
    console.error("Error during validation:", err);
    await updateLogEntry(logId, { status: 'failed', error_message: err.message });
    return res.status(502).json({ error: "Controller unreachable", logId });
  }
  if (!validationResult.approved) {
    await updateLogEntry(logId, { status: 'rejected', validator_result: JSON.stringify(validationResult)});
    return res.status(422).json({ approved: false, violations: validationResult.violations, warnings: validationResult.warnings, logId });
  }
   // 7b. If approved:
  //     - update log to status='validated'
  //     - client.sendPreemptionCall(signalGroup)
  //     - update log to status='sent', raw_command=..., sent_at=NOW()
  //     - (optional) attempt a follow-up getPreemptionStatus() to confirm
  //     - update log to status='confirmed', confirmed_at=NOW()
  //     - return 200 { approved: true, warnings, logId, phaseState }
  //
  try {
    await adapter.sendPreemptionCall(zoneConfig.signal_group);
    await updateLogEntry(logId, { status: 'sent', raw_command: `PREEMPT_CALL:signal_group=${zoneConfig.signal_group}`, sent_at: new Date() });

    const status = await adapter.getPreemptionStatus();
    await updateLogEntry(logId, { status: 'confirmed', confirmed_at: new Date()});
    return res.status(200).json({ approved: true, warnings: validationResult.warnings, logId, phaseState: status.phaseState});
  } catch (err) {
    console.error("Error during preemption call:", err);
    await updateLogEntry(logId, { status: 'failed', error_message: err.message });
    return res.status(502).json({ error: "Controller unreachable", logId });
  } finally {
    await adapter.close();
  }
  
  
  
 
  // On any SNMP/network error after validation:
  //   - update log to status='failed', error_message=err.message
  //   - return 502 { error: "Controller unreachable", logId }
  //
  // Always call client.close() in a finally block.
  //


});

// ── POST /api/preemption-commands/:logId/clear ────────────────────────────────
router.post("/:logId/clear", async (req, res) => {
  // 1. Parse & validate logId
  const logId = parseId(req.params.logId);
  if (!logId) {
    return res.status(400).json({ error: "Invalid logId" });
  }

  // 2. Load original log entry — 404 if not found
  const originalLog = await db.query(`SELECT * FROM preemption_command_log WHERE id = $1`, [logId]);
  if (originalLog.rows.length === 0) {
    return res.status(404).json({ error: "Log entry not found" });
  }
  const logEntry = originalLog.rows[0];

  // 3. Load zone config
  const zoneConfig = await loadZoneConfig(logEntry.preemption_zone_config_id);
  if (!zoneConfig) {
    return res.status(404).json({ error: "Associated preemption zone config not found" });
  }

  // 4. Build adapter/client
  let adapter;
  const adapterRow = await loadAdapterForZoneConfig(logEntry.preemption_zone_config_id);
  if (adapterRow) {
    adapter = ControllerClientFactory.forAdapter(adapterRow);
  } else {
    adapter = ControllerClientFactory.forIp(zoneConfig.controller_ip);
  }

  // 5. Send clear command, log it, return result
  try {
    // TODO: await adapter.clearPreemptionCall(zoneConfig.signal_group)
    await adapter.clearPreemptionCall(zoneConfig.signal_group);

    // createLogEntry({ ..., status: 'sent', triggered_by: 'operator', raw_command: 'CLEAR' })
    const { id: newLogId } = await createLogEntry({
      preemption_zone_config_id: logEntry.preemption_zone_config_id,
      controller_adapter_id: adapterRow ? adapterRow.id : null,
      triggered_by: 'operator',
      user_id: null,
      status: 'sent',
      validator_result: null,
      raw_command: 'CLEAR',
      requested_at: new Date(),
    })

    return res.status(200).json({ cleared: true, logId: newLogId });
  } catch (err) {
    return res.status(502).json({ error: "Controller unreachable", logId });
  } finally {
    await adapter.close();
  }
});

// ── GET /api/preemption-commands/log ─────────────────────────────────────────
router.get("/log", async (req, res) => {
  const limit  = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  const values     = [];

  if (req.query.zone_config_id) {
    values.push(Number(req.query.zone_config_id));
    conditions.push(`pcl.preemption_zone_config_id = $${values.length}`);
  }
  if (req.query.intersection_id) {
    values.push(Number(req.query.intersection_id));
    conditions.push(`pzc.intersection_id = $${values.length}`);
  }
  if (req.query.status) {
    values.push(req.query.status);
    conditions.push(`pcl.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit, offset);
  const sql = `
    SELECT
      pcl.*,
      pzc.name  AS zone_name,
      ca.label  AS adapter_label
    FROM preemption_command_log pcl
    JOIN      preemption_zone_configs pzc ON pzc.id = pcl.preemption_zone_config_id
    LEFT JOIN controller_adapters     ca  ON ca.id  = pcl.controller_adapter_id
    ${where}
    ORDER BY pcl.requested_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  try {
    const result = await db.query(sql, values);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB error fetching command log:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ── GET /api/preemption-commands/log/:logId ───────────────────────────────────
router.get("/log/:logId", async (req, res) => {
  const logId = parseId(req.params.logId);
  if (!logId) {
    return res.status(400).json({ error: "Invalid logId" });
  }

  try {
    const result = await db.query(`
      SELECT
        pcl.*,
        pzc.name  AS zone_name,
        ca.label  AS adapter_label
      FROM preemption_command_log pcl
      JOIN      preemption_zone_configs pzc ON pzc.id = pcl.preemption_zone_config_id
      LEFT JOIN controller_adapters     ca  ON ca.id  = pcl.controller_adapter_id
      WHERE pcl.id = $1
      LIMIT 1
    `, [logId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Log entry not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("DB error fetching log entry:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ── GET /api/preemption-commands/status/:zoneConfigId ────────────────────────
router.get("/status/:zoneConfigId", async (req, res) => {
  const zoneConfigId = parseId(req.params.zoneConfigId);
  if (!zoneConfigId) {
    return res.status(400).json({ error: "Invalid zoneConfigId" });
  }

  const zoneConfig = await loadZoneConfig(zoneConfigId);
  if (!zoneConfig) {
    return res.status(404).json({ error: "Preemption zone config not found" });
  }

  const adapterRow = await loadAdapterForZoneConfig(zoneConfigId);
  const adapter = adapterRow
    ? ControllerClientFactory.forAdapter(adapterRow)
    : ControllerClientFactory.forIp(zoneConfig.controller_ip);

  try {
    const liveStatus = await adapter.getPreemptionStatus(zoneConfig.signal_group);

    const lastCommandResult = await db.query(`
      SELECT * FROM preemption_command_log
      WHERE preemption_zone_config_id = $1
      ORDER BY requested_at DESC
      LIMIT 1
    `, [zoneConfigId]);

    return res.status(200).json({
      liveStatus,
      lastCommand: lastCommandResult.rows[0] ?? null,
    });
  } catch (err) {
    console.error("Error fetching preemption status:", err);
    return res.status(502).json({ error: "Controller unreachable" });
  } finally {
    await adapter.close();
  }
});

module.exports = router;
