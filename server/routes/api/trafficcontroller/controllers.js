/**
 * Controller Adapter Management API
 *
 * Manages rows in the controller_adapters table and exposes
 * a live health-probe endpoint.
 *
 * Routes:
 *   GET    /api/controllers                     list adapters (filter by intersection_id)
 *   GET    /api/controllers/:id                 get one adapter
 *   POST   /api/controllers                     create adapter
 *   PUT    /api/controllers/:id                 update adapter
 *   DELETE /api/controllers/:id                 delete adapter
 *   POST   /api/controllers/:id/probe           live SNMP probe (updates firmware_version
 *                                               and supported_oids, sets last_seen_at)
 *   GET    /api/controllers/:id/phase/:group    live phase status for one signal group
 *   GET    /api/controllers/:id/timings/:group  live timing parameters for one signal group
 *   GET    /api/controllers/audit-log           full audit log (filter by adapter_id)
 *   GET    /api/controllers/:id/audit-log       audit log for one adapter
 *
 * Every CREATE / UPDATE / DELETE writes a row to controller_adapter_audit_log.
 */

const express = require("express");
const router  = express.Router();
const db      = require("../../../database/postgis");
const { parseCanonicalIntersectionId } = require("../../../utils/intersectionIdentity");
const { ControllerClientFactory }      = require("../../../services/controllerClient");

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_ADAPTER_TYPES    = ["ntcip1202", "siemens_m60", "econolite_aries", "peek_ada", "generic_snmp"];
const VALID_STATUSES         = ["active", "offline", "maintenance"];
const VALID_CONNECTION_MODES = ["snmp", "telnet", "both"];
const UPDATABLE_FIELDS       = [
  "label", "ip_address", "snmp_port", "snmp_community", "adapter_type",
  "firmware_version", "timeout_seconds", "retry_count", "connection_status",
  "telnet_port", "telnet_username", "telnet_password", "connection_mode",
];

// ── Validation helpers ────────────────────────────────────────────────────────

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Validate a create or update payload.
 * Pass isCreate=true to enforce required fields.
 * Returns null if valid, or an error string.
 */
function validateAdapterPayload(body, isCreate = false) {
  if (isCreate) {
    if (!body.ip_address || typeof body.ip_address !== "string" || !body.ip_address.trim()) {
      return "ip_address is required";
    }
    const iid = Number(body.intersection_id);
    if (!Number.isInteger(iid) || iid <= 0) {
      return "intersection_id must be a positive integer";
    }
  }
  if (body.ip_address !== undefined) {
    if (typeof body.ip_address !== "string" || !body.ip_address.trim()) {
      return "ip_address must be a non-empty string";
    }
  }
  if (body.adapter_type !== undefined && !VALID_ADAPTER_TYPES.includes(body.adapter_type)) {
    return `adapter_type must be one of: ${VALID_ADAPTER_TYPES.join(", ")}`;
  }
  if (body.snmp_port !== undefined) {
    const port = Number(body.snmp_port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return "snmp_port must be an integer between 1 and 65535";
    }
  }
  if (body.timeout_seconds !== undefined) {
    const t = Number(body.timeout_seconds);
    if (!Number.isInteger(t) || t <= 0) {
      return "timeout_seconds must be a positive integer";
    }
  }
  if (body.retry_count !== undefined) {
    const r = Number(body.retry_count);
    if (!Number.isInteger(r) || r < 0) {
      return "retry_count must be a non-negative integer";
    }
  }
  if (body.connection_status !== undefined && !VALID_STATUSES.includes(body.connection_status)) {
    return `connection_status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  if (body.telnet_port !== undefined) {
    const tp = Number(body.telnet_port);
    if (!Number.isInteger(tp) || tp < 1 || tp > 65535) {
      return "telnet_port must be an integer between 1 and 65535";
    }
  }
  if (body.connection_mode !== undefined && !VALID_CONNECTION_MODES.includes(body.connection_mode)) {
    return `connection_mode must be one of: ${VALID_CONNECTION_MODES.join(", ")}`;
  }
  return null;
}

// ── Audit log helper ──────────────────────────────────────────────────────────

async function insertAuditLog(adapterId, action, oldValues, newValues, triggeredBy = "api", userId = null) {
  await db.query(
    `INSERT INTO controller_adapter_audit_log
       (adapter_id, action, changed_by_user_id, triggered_by, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      adapterId,
      action,
      userId,
      triggeredBy,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
    ],
  );
}

// ── SELECT helper ─────────────────────────────────────────────────────────────

function baseSelect() {
  return `
    SELECT
      ca.id,
      ca.intersection_id,
      i.name  AS intersection_name,
      ca.label,
      ca.ip_address,
      ca.snmp_port,
      ca.snmp_community,
      ca.adapter_type,
      ca.firmware_version,
      ca.supported_oids,
      ca.timeout_seconds,
      ca.retry_count,
      ca.connection_status,
      ca.last_seen_at,
      ca.created_at,
      ca.updated_at,
      ca.telnet_port,
      ca.telnet_username,
      ca.connection_mode
    FROM controller_adapters ca
    JOIN intersections i ON i.intersection_id = ca.intersection_id
  `;
}

// ── GET /api/controllers/audit-log ───────────────────────────────────────────
// Must be registered BEFORE /:id so Express doesn't match "audit-log" as an id.
router.get("/audit-log", async (req, res) => {
  try {
    const conditions = [];
    const values     = [];

    if (req.query.adapter_id !== undefined) {
      const aid = parseId(req.query.adapter_id);
      if (!aid) return res.status(400).json({ error: "adapter_id must be a positive integer" });
      conditions.push(`al.adapter_id = $${values.length + 1}`);
      values.push(aid);
    }
    if (req.query.action !== undefined) {
      if (!["CREATE", "UPDATE", "DELETE"].includes(req.query.action.toUpperCase())) {
        return res.status(400).json({ error: "action must be CREATE, UPDATE, or DELETE" });
      }
      conditions.push(`al.action = $${values.length + 1}`);
      values.push(req.query.action.toUpperCase());
    }

    const limit  = Math.min(Number(req.query.limit)  || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT
         al.id,
         al.adapter_id,
         ca.label                                        AS adapter_label,
         ca.ip_address                                   AS adapter_ip,
         al.action,
         al.changed_by_user_id,
         u.username                                      AS changed_by_username,
         u.first_name || ' ' || u.last_name              AS changed_by_name,
         al.triggered_by,
         al.old_values,
         al.new_values,
         al.changed_at
       FROM controller_adapter_audit_log al
       LEFT JOIN controller_adapters ca ON ca.id = al.adapter_id
       LEFT JOIN users u ON u.id = al.changed_by_user_id
       ${where}
       ORDER BY al.changed_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/controllers/audit-log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/controllers/timing-constraints ───────────────────────────────────
// Must be registered BEFORE /:id to avoid Express matching the literal string as an id.
router.get("/timing-constraints", async (req, res) => {
  const zoneConfigId = Number(req.query.preemption_zone_config_id);
  if (!Number.isInteger(zoneConfigId) || zoneConfigId <= 0) {
    return res.status(400).json({ error: "preemption_zone_config_id is required and must be a positive integer" });
  }
  try {
    const result = await db.query(
      "SELECT * FROM controller_timing_constraints WHERE preemption_zone_config_id = $1 LIMIT 1",
      [zoneConfigId],
    );
    res.json(result.rows[0] ?? null);
  } catch (err) {
    console.error("GET /api/controllers/timing-constraints error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/controllers/timing-constraints ───────────────────────────────────
router.put("/timing-constraints", async (req, res) => {
  const {
    preemption_zone_config_id,
    min_green_before_preempt_s,
    ped_walk_interval_s,
    ped_clearance_interval_s,
    yellow_change_interval_s,
    all_red_clearance_s,
    preempt_green_hold_s,
    max_preempt_duration_s,
    min_call_interval_s,
  } = req.body;

  const zoneConfigId = Number(preemption_zone_config_id);
  if (!Number.isInteger(zoneConfigId) || zoneConfigId <= 0) {
    return res.status(400).json({ error: "preemption_zone_config_id is required and must be a positive integer" });
  }

  try {
    const result = await db.query(
      `INSERT INTO controller_timing_constraints
         (preemption_zone_config_id, min_green_before_preempt_s, ped_walk_interval_s,
          ped_clearance_interval_s, yellow_change_interval_s, all_red_clearance_s,
          preempt_green_hold_s, max_preempt_duration_s, min_call_interval_s)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (preemption_zone_config_id) DO UPDATE SET
         min_green_before_preempt_s = COALESCE(EXCLUDED.min_green_before_preempt_s, controller_timing_constraints.min_green_before_preempt_s),
         ped_walk_interval_s        = COALESCE(EXCLUDED.ped_walk_interval_s,        controller_timing_constraints.ped_walk_interval_s),
         ped_clearance_interval_s   = COALESCE(EXCLUDED.ped_clearance_interval_s,   controller_timing_constraints.ped_clearance_interval_s),
         yellow_change_interval_s   = COALESCE(EXCLUDED.yellow_change_interval_s,   controller_timing_constraints.yellow_change_interval_s),
         all_red_clearance_s        = COALESCE(EXCLUDED.all_red_clearance_s,        controller_timing_constraints.all_red_clearance_s),
         preempt_green_hold_s       = COALESCE(EXCLUDED.preempt_green_hold_s,       controller_timing_constraints.preempt_green_hold_s),
         max_preempt_duration_s     = COALESCE(EXCLUDED.max_preempt_duration_s,     controller_timing_constraints.max_preempt_duration_s),
         min_call_interval_s        = COALESCE(EXCLUDED.min_call_interval_s,        controller_timing_constraints.min_call_interval_s),
         updated_at                 = NOW()
       RETURNING *`,
      [
        zoneConfigId,
        min_green_before_preempt_s ?? null,
        ped_walk_interval_s        ?? null,
        ped_clearance_interval_s   ?? null,
        yellow_change_interval_s   ?? null,
        all_red_clearance_s        ?? null,
        preempt_green_hold_s       ?? null,
        max_preempt_duration_s     ?? null,
        min_call_interval_s        ?? null,
      ],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/controllers/timing-constraints error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/controllers ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    if (req.query.intersection_id !== undefined) {
      const intersectionId = parseCanonicalIntersectionId(req.query.intersection_id);
      if (!intersectionId) {
        return res.status(400).json({ error: "intersection_id must be a positive integer" });
      }
      const result = await db.query(
        `${baseSelect()} WHERE ca.intersection_id = $1 ORDER BY ca.label`,
        [intersectionId],
      );
      return res.json(result.rows);
    }
    const result = await db.query(`${baseSelect()} ORDER BY ca.intersection_id, ca.label`);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/controllers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/controllers/:id ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const result = await db.query(`${baseSelect()} WHERE ca.id = $1 LIMIT 1`, [id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/controllers/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/controllers ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const validationError = validateAdapterPayload(req.body, true);
  if (validationError) return res.status(400).json({ error: validationError });

  const intersectionId = parseCanonicalIntersectionId(req.body.intersection_id);
  const intersectionCheck = await db.query(
    "SELECT 1 FROM intersections WHERE intersection_id = $1 LIMIT 1",
    [intersectionId],
  );
  if (!intersectionCheck.rows.length) {
    return res.status(404).json({ error: `Intersection ${intersectionId} not found` });
  }

  const {
    ip_address,
    label             = ip_address,
    snmp_port         = 161,
    snmp_community    = "public",
    adapter_type      = "ntcip1202",
    firmware_version  = null,
    timeout_seconds   = 5,
    retry_count       = 2,
    connection_status = "active",
    telnet_port       = 23,
    telnet_username   = null,
    telnet_password   = null,
    connection_mode   = "snmp",
    user_id           = null,
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO controller_adapters
         (intersection_id, label, ip_address, snmp_port, snmp_community,
          adapter_type, firmware_version, timeout_seconds, retry_count, connection_status,
          telnet_port, telnet_username, telnet_password, connection_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        intersectionId, label, ip_address.trim(), snmp_port, snmp_community,
        adapter_type, firmware_version, timeout_seconds, retry_count, connection_status,
        telnet_port, telnet_username, telnet_password, connection_mode,
      ],
    );
    const newRow = result.rows[0];
    await insertAuditLog(newRow.id, "CREATE", null, newRow, "api", user_id);
    res.status(201).json(newRow);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: `A controller with IP address ${ip_address} already exists` });
    }
    console.error("POST /api/controllers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/controllers/:id ──────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  if (req.body.intersection_id !== undefined) {
    return res.status(400).json({ error: "intersection_id cannot be changed after creation" });
  }

  const validationError = validateAdapterPayload(req.body, false);
  if (validationError) return res.status(400).json({ error: validationError });

  const fields = UPDATABLE_FIELDS.filter(f => req.body[f] !== undefined);
  if (!fields.length) return res.status(400).json({ error: "No updatable fields provided" });

  try {
    const oldResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!oldResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    const oldRow = oldResult.rows[0];

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
    const values     = fields.map(f => f === "ip_address" ? req.body[f].trim() : req.body[f]);
    values.push(id);

    const result = await db.query(
      `UPDATE controller_adapters SET ${setClauses.join(", ")} WHERE id = $${fields.length + 1} RETURNING *`,
      values,
    );
    const newRow = result.rows[0];
    await insertAuditLog(id, "UPDATE", oldRow, newRow, "api", req.body.user_id ?? null);
    res.json(newRow);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A controller with that IP address already exists" });
    }
    console.error("PUT /api/controllers/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/controllers/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const result = await db.query(
      "DELETE FROM controller_adapters WHERE id = $1 RETURNING *",
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    const deletedRow = result.rows[0];
    // adapter_id will be NULL in the audit row due to ON DELETE SET NULL on the FK
    await insertAuditLog(null, "DELETE", deletedRow, null, "api", req.query.user_id ?? null);
    res.json({ deleted: true, id });
  } catch (err) {
    console.error("DELETE /api/controllers/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/controllers/:id/probe ──────────────────────────────────────────
router.post("/:id/probe", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  let client = null;
  try {
    const adapterResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!adapterResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });

    client = ControllerClientFactory.forAdapter(adapterResult.rows[0]);
    const { controllerType, supported } = await client.probe();

    const updated = await db.query(
      `UPDATE controller_adapters
         SET firmware_version  = $1,
             supported_oids    = $2::jsonb,
             last_seen_at      = NOW(),
             connection_status = 'active'
       WHERE id = $3
       RETURNING *`,
      [controllerType, JSON.stringify(supported), id],
    );
    res.json({ probed: true, controllerType, supported, adapter: updated.rows[0] });
  } catch (err) {
    await db.query(
      "UPDATE controller_adapters SET connection_status = 'offline' WHERE id = $1",
      [id],
    ).catch(() => {});
    console.error("POST /api/controllers/:id/probe error:", err);
    res.status(502).json({ error: "Controller unreachable", detail: err.message });
  } finally {
    if (client) client.close();
  }
});

// ── GET /api/controllers/:id/phase/:group ────────────────────────────────────
router.get("/:id/phase/:group", async (req, res) => {
  const id    = parseId(req.params.id);
  const group = parseId(req.params.group);
  if (!id || !group) return res.status(400).json({ error: "Invalid id or group" });

  let client = null;
  try {
    const adapterResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!adapterResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    client = ControllerClientFactory.forAdapter(adapterResult.rows[0]);
    const phaseStatus = await client.getPhaseStatus(group);
    res.json(phaseStatus);
  } catch (err) {
    console.error("GET /api/controllers/:id/phase/:group error:", err);
    res.status(502).json({ error: "Controller unreachable", detail: err.message });
  } finally {
    if (client) client.close();
  }
});

// ── GET /api/controllers/:id/timings/:group ───────────────────────────────────
router.get("/:id/timings/:group", async (req, res) => {
  const id    = parseId(req.params.id);
  const group = parseId(req.params.group);
  if (!id || !group) return res.status(400).json({ error: "Invalid id or group" });

  let client = null;
  try {
    const adapterResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!adapterResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    client = ControllerClientFactory.forAdapter(adapterResult.rows[0]);
    const timings = await client.getTimingParameters(group);
    res.json(timings);
  } catch (err) {
    console.error("GET /api/controllers/:id/timings/:group error:", err);
    res.status(502).json({ error: "Controller unreachable", detail: err.message });
  } finally {
    if (client) client.close();
  }
});

// ── GET /api/controllers/:id/audit-log ───────────────────────────────────────
router.get("/:id/audit-log", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const exists = await db.query(
      "SELECT 1 FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!exists.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });

    const limit  = Math.min(Number(req.query.limit)  || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const result = await db.query(
      `SELECT
         al.id,
         al.adapter_id,
         al.action,
         al.changed_by_user_id,
         u.username                     AS changed_by_username,
         u.first_name || ' ' || u.last_name AS changed_by_name,
         al.triggered_by,
         al.old_values,
         al.new_values,
         al.changed_at
       FROM controller_adapter_audit_log al
       LEFT JOIN users u ON u.id = al.changed_by_user_id
       WHERE al.adapter_id = $1
       ORDER BY al.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/controllers/:id/audit-log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/controllers/:id/telnet/test ─────────────────────────────────────
router.post("/:id/telnet/test", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const adapterResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!adapterResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    const row = adapterResult.rows[0];

    if (row.adapter_type !== "siemens_m60") {
      return res.status(400).json({ error: "Telnet test is only available for siemens_m60 adapters" });
    }
    if (!row.telnet_username || !row.telnet_password) {
      return res.status(400).json({ error: "Telnet credentials not configured on this adapter" });
    }

    const client = ControllerClientFactory.forAdapter(row);
    const result = await client.testTelnetConnection(row.telnet_username, row.telnet_password);
    res.json(result);
  } catch (err) {
    console.error("POST /api/controllers/:id/telnet/test error:", err);
    const status = err.name === "TelnetAuthError" ? 401 : 502;
    res.status(status).json({ error: err.message });
  }
});

// ── POST /api/controllers/:id/telnet/command ──────────────────────────────────
router.post("/:id/telnet/command", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { command } = req.body;
  if (!command || typeof command !== "string" || !command.trim()) {
    return res.status(400).json({ error: "command is required" });
  }

  try {
    const adapterResult = await db.query(
      "SELECT * FROM controller_adapters WHERE id = $1 LIMIT 1",
      [id],
    );
    if (!adapterResult.rows[0]) return res.status(404).json({ error: "Controller adapter not found" });
    const row = adapterResult.rows[0];

    if (row.adapter_type !== "siemens_m60") {
      return res.status(400).json({ error: "Telnet commands are only available for siemens_m60 adapters" });
    }
    if (!row.telnet_username || !row.telnet_password) {
      return res.status(400).json({ error: "Telnet credentials not configured on this adapter" });
    }

    const client = ControllerClientFactory.forAdapter(row);
    const result = await client.sendTelnetCommand(row.telnet_username, row.telnet_password, command.trim());

    // Log the command to the audit trail (output truncated to 200 chars)
    await insertAuditLog(id, "UPDATE", null, {
      telnet_command: command.trim(),
      output_preview: result.output.slice(0, 200),
    }, "api", req.body.user_id ?? null);

    res.json(result);
  } catch (err) {
    console.error("POST /api/controllers/:id/telnet/command error:", err);
    const status = err.name === "TelnetAuthError" ? 401 : 502;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
