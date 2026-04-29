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
 *
 * All write operations validate intersection_id existence using the same
 * parseCanonicalIntersectionId helper used by the rest of the codebase.
 */

const express = require("express");
const router  = express.Router();
const db      = require("../../../database/postgis");
const { parseCanonicalIntersectionId } = require("../../../utils/intersectionIdentity");
const { ControllerClientFactory }      = require("../../../services/controllerClient");

// ── Validation helpers ────────────────────────────────────────────────────────

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Valid adapter_type values must match ADAPTER_MAP keys in controllerClient.js
const VALID_ADAPTER_TYPES = ["ntcip1202", "siemens_m60", "econolite_aries", "peek_ada", "generic_snmp"];

function validateAdapterPayload(body) {
  // Returns null if valid, or an error string if invalid.
  // Required on create: ip_address, intersection_id
  // Optional: label, snmp_port, snmp_community, adapter_type, timeout_seconds, retry_count
  // TODO: implement validation logic
  // HINT: check ip_address is non-empty string, intersection_id is a positive integer,
  //       adapter_type is one of VALID_ADAPTER_TYPES if provided,
  //       snmp_port is 1–65535 if provided, timeout_seconds > 0 if provided
}

// ── SELECT helper ─────────────────────────────────────────────────────────────

function baseSelect() {
  // HINT: join controller_adapters (ca) with intersections (i) on
  //       ca.intersection_id = i.intersection_id to include intersection name
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
      ca.updated_at
    FROM controller_adapters ca
    JOIN intersections i ON i.intersection_id = ca.intersection_id
  `;
}

// ── GET /api/controllers ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  // TODO: if req.query.intersection_id is provided, filter by it
  //       otherwise return all adapters ordered by intersection_id, label
  // HINT: use parseCanonicalIntersectionId for the query param
});

// ── GET /api/controllers/:id ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  // TODO: fetch single adapter by id, return 404 if not found
});

// ── POST /api/controllers ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  // TODO: validate payload with validateAdapterPayload
  //       verify intersection exists with ensureIntersectionExists
  //       INSERT into controller_adapters, return 201 with the new row
  // HINT: conflict on ip_address unique constraint → 409 with friendly message
});

// ── PUT /api/controllers/:id ──────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  // TODO: build a dynamic SET clause from whichever fields are present in body
  //       intersection_id is immutable — reject attempts to change it
  //       return 404 if id not found, 409 on ip_address conflict
});

// ── DELETE /api/controllers/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  // TODO: DELETE by id, return 404 if not found
});

// ── POST /api/controllers/:id/probe ──────────────────────────────────────────
router.post("/:id/probe", async (req, res) => {
  // Live SNMP probe — connects to the controller, reads controllerType OID,
  // and updates firmware_version, supported_oids, last_seen_at, connection_status.
  //
  // HINT:
  //   1. Fetch the adapter row by id
  //   2. ControllerClientFactory.forAdapter(adapterRow)
  //   3. client.probe() → { controllerType, supported }
  //   4. UPDATE controller_adapters SET firmware_version=$1, supported_oids=$2,
  //         last_seen_at=NOW(), connection_status='active' WHERE id=$3
  //   5. On SNMP error, set connection_status='offline', return 502 with error
  //   6. Always call client.close() in a finally block
});

// ── GET /api/controllers/:id/phase/:group ────────────────────────────────────
router.get("/:id/phase/:group", async (req, res) => {
  // Returns live phase status for a single signal group from the controller.
  //
  // HINT:
  //   1. Parse id and group as integers
  //   2. Fetch adapter row, build client
  //   3. client.getPhaseStatus(group)
  //   4. Return the result; always close client in finally
  //   5. On SNMP timeout or connection error return 502
});

// ── GET /api/controllers/:id/timings/:group ───────────────────────────────────
router.get("/:id/timings/:group", async (req, res) => {
  // Returns live timing parameters for a single signal group.
  // Useful to pre-fill or validate the timing constraints form in the UI.
  //
  // HINT: same pattern as /phase/:group but call client.getTimingParameters(group)
});

module.exports = router;
