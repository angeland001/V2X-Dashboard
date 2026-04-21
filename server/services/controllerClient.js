/**
 * NTCIP 1202 Controller Abstraction Layer
 *
 * Exposes a unified API regardless of vendor:
 *
 *   const client = ControllerClientFactory.forAdapter(adapterRow);
 *   const phase  = await client.getPhaseStatus(signalGroup);
 *   await client.sendPreemptionCall(signalGroup);
 *   const status = await client.getPreemptionStatus();
 *
 * Adapter row shape comes from the controller_adapters table:
 *   { id, ip_address, snmp_port, snmp_community, adapter_type,
 *     timeout_seconds, retry_count }
 *
 * Supported adapter_type values (set in controller_adapters.adapter_type):
 *   ntcip1202        — pure NTCIP 1202 / SNMP, vendor-neutral baseline
 *   siemens_m60      — Siemens M60 + SEPAC extensions
 *   econolite_aries  — Econolite ARIES/Cobalt quirks
 *   peek_ada         — Peek ATC/ADA quirks
 *   generic_snmp     — Fallback: NTCIP 1202 with no extensions
 *
 * SNMP communication uses the `net-snmp` npm package.
 * If it's not installed, the factory silently returns a StubAdapter
 * that returns realistic fake data so the UI works without hardware.
 *
 * Install: cd server && npm install net-snmp
 */

// Attempt to load net-snmp; fall back gracefully to stub mode
let snmp = null;
try {
  snmp = require("net-snmp");
} catch {
  // net-snmp not installed; all adapters will use StubAdapter
  console.error("[ControllerClient] net-snmp not found; using stub adapters");
}

// ── NTCIP 1202 Object Identifiers ────────────────────────────────────────────
// Canonical OIDs from NTCIP 1202 v02.19 (NEMA).
//
// OID anatomy (example: 1.3.6.1.4.1.1206.4.2.1.6.2.1.16.2):
//   1.3.6.1.4.1.1206   = NTCIP enterprise tree
//   .4.2.1             = NTCIP 1202 actuated signal controller objects
//   .6                 = preempt group
//   .6.2               = preemptTable
//   .6.2.1             = preemptEntry (row structure)
//   .6.2.1.16          = column 16 = preemptState
//   .6.2.1.16.2        = preemptState for Preempt channel 2
//
// For table OIDs below: append "." + N (1-indexed channel/phase number).
// Vendor-specific OIDs are defined inside the per-adapter sections below.
const OID = {
  // ── Phase table (NTCIP 1202 §4 / object group 1) ─────────────────────────
  // Append ".N" for phase N.
  // Phase current state bitmask — see PHASE_BIT below for decode
  phaseStatus:              "1.3.6.1.4.1.1206.4.2.1.1.4.1.3",

  // Phase timing — all raw values in tenths of a second; divide by 10 for seconds
  phaseMinGreen:            "1.3.6.1.4.1.1206.4.2.1.1.4.1.6",
  phaseMaxGreen:            "1.3.6.1.4.1.1206.4.2.1.1.4.1.7",
  phaseWalk:                "1.3.6.1.4.1.1206.4.2.1.1.4.1.10",
  phasePedestrianClear:     "1.3.6.1.4.1.1206.4.2.1.1.4.1.11",
  phaseYellowChange:        "1.3.6.1.4.1.1206.4.2.1.1.4.1.12",
  phaseRedClearance:        "1.3.6.1.4.1.1206.4.2.1.1.4.1.13",

  // ── Unit-level preemption (NTCIP 1202 §3 / object group 1 — legacy) ──────
  // These are bitmask registers: bit N-1 = preempt input N.
  // Prefer the preemptTable OIDs below for per-channel control on modern firmware.
  unitPreemptState:         "1.3.6.1.4.1.1206.4.2.1.1.1.1.11",  // read-only
  unitPreemptInput:         "1.3.6.1.4.1.1206.4.2.1.1.1.1.12",  // writable bitmask

  // ── Preempt group (NTCIP 1202 §6) — preferred per-channel interface ───────

  // Scalar: total number of preemption channels this controller supports
  maxPreempts:              "1.3.6.1.4.1.1206.4.2.1.6.1.0",

  // preemptTable (§6.2) — status and timing for each preempt channel.
  // Append ".N" for preempt channel N.
  // Column 16: preemptState — read-only current status (see PREEMPT_STATE below)
  preemptState:             "1.3.6.1.4.1.1206.4.2.1.6.2.1.16",

  // Timing columns — raw values in tenths of a second; divide by 10 for seconds
  // Column 3: delay before preempt phase begins after input asserted
  preemptDelay:             "1.3.6.1.4.1.1206.4.2.1.6.2.1.3",
  // Column 4: minimum green time on the preemption approach phase
  preemptMinGreen:          "1.3.6.1.4.1.1206.4.2.1.6.2.1.4",
  // Column 5: minimum total time the controller must stay in preempt service
  preemptMinDuration:       "1.3.6.1.4.1.1206.4.2.1.6.2.1.5",
  // Column 6: maximum time in preempt before automatic return to normal
  preemptMaxOut:            "1.3.6.1.4.1.1206.4.2.1.6.2.1.6",
  // Column 7: pedestrian walk interval during preempt service
  preemptPedWalk:           "1.3.6.1.4.1.1206.4.2.1.6.2.1.7",
  // Column 8: pedestrian clearance (flashing don't walk) during preempt service
  preemptPedClear:          "1.3.6.1.4.1.1206.4.2.1.6.2.1.8",
  // Column 9: yellow change interval at preempt exit
  preemptYellow:            "1.3.6.1.4.1.1206.4.2.1.6.2.1.9",
  // Column 10: red clearance interval at preempt exit
  preemptRed:               "1.3.6.1.4.1.1206.4.2.1.6.2.1.10",

  // preemptControl table (§6.3) — write commands to a specific preempt channel.
  // Append ".N" for preempt channel N.
  // Column 2: preemptControlState — writable (see PREEMPT_CONTROL below)
  preemptControlState:      "1.3.6.1.4.1.1206.4.2.1.6.3.1.2",

  // ── Controller identification ─────────────────────────────────────────────
  controllerType:           "1.3.6.1.2.1.1.1.0",
};

// Phase status bitmask constants (NTCIP 1202 Table 4-11)
// HINT: use bitwise AND to check individual flags:
//   const isGreen = !!(raw & PHASE_BIT.GREEN)
const PHASE_BIT = {
  WALK:       0x01,
  PED_CLEAR:  0x02,
  MIN_GREEN:  0x04,
  GREEN:      0x08,
  YELLOW:     0x10,
  RED_CLEAR:  0x20,
  RED:        0x40,
  NEXT:       0x80,  // phase next-in-sequence
};

// preemptState column 16 values (NTCIP 1202 §6.2, preemptEntry)
// Read from OID.preemptState + "." + preemptNum
const PREEMPT_STATE = {
  INACTIVE:               1,  // preempt input not asserted
  PREEMPTING:             2,  // preempt phase in service
  LINKED_PREEMPT_WAITING: 3,  // waiting for a linked higher-priority preempt to finish
};

// preemptControlState column 2 values (NTCIP 1202 §6.3, preemptControlEntry)
// Write to OID.preemptControlState + "." + preemptNum
const PREEMPT_CONTROL = {
  INACTIVE:  1,  // no active command; controller returns to normal
  FORCE_ON:  2,  // assert preemption for this channel
  FORCE_OFF: 3,  // clear / cancel active preemption for this channel
};

// ── SNMP Session Factory ──────────────────────────────────────────────────────

function buildSnmpSession(adapter) {
  // HINT: snmp.Version2c is the right version for NTCIP 1202 deployments
  // snmp.createSession(host, community, options) returns a session object
  // TODO: implement using net-snmp session options from the adapter row
}

// ── Promisified SNMP wrappers ─────────────────────────────────────────────────
// HINT: net-snmp uses callbacks; wrap them in Promises for async/await usage.
// session.get(oids, callback(err, varbinds)) — varbinds is an array of { oid, value }
// session.set(varbinds, callback(err))       — each varbind needs { oid, type, value }
// Use snmp.isVarbindError(vb) to check for per-OID errors in the get response

function snmpGet(session, oids) {
  // TODO: wrap session.get in a Promise, resolve with { oid: value } map
}

function snmpSet(session, varbinds) {
  // TODO: wrap session.set in a Promise
}

// ── Stub Adapter ──────────────────────────────────────────────────────────────
// Returns hardcoded realistic data.  All methods must match the real adapter API.
// The factory returns this when net-snmp is unavailable or IP is unreachable.

class StubAdapter {
  constructor(adapter) {
    this._adapter = adapter;
    this._preemptActive = false;
  }

  async probe() {
    // TODO: return { controllerType: "STUB/...", supported: [...OID keys] }
  }

  async getPhaseStatus(signalGroup) {
    // TODO: return an object shaped like the real adapter result:
    // { signalGroup, raw, walk, pedClear, minGreen, green, yellow, redClear, red, label, source }
    // label should be one of: "WALK" | "PED_CLEAR" | "GREEN" | "YELLOW" | "RED"
  }

  async getTimingParameters(signalGroup) {
    // TODO: return { signalGroup, minGreen_s, maxGreen_s, walk_s, pedClear_s,
    //                yellowChange_s, redClearance_s, source }
    // Use realistic MUTCD-compliant defaults (walk=7, pedClear=11, yellow=4, allRed=2)
  }

  async getPreemptionStatus() {
    // TODO: return { activeInputs: [], raw: 0, source: "stub" }
    // When _preemptActive is true, include input 1 in activeInputs
  }

  async sendPreemptionCall(signalGroup, _options = {}) {
    // TODO: set _preemptActive = true, log the call, return { sent: true, source: "stub" }
  }

  async clearPreemptionCall(signalGroup) {
    // TODO: set _preemptActive = false, return { cleared: true, source: "stub" }
  }

  async getMaxPreempts() {
    // TODO: return { maxPreempts: 8, source: "stub" }
  }

  async getPreemptChannelStatus(preemptNum) {
    // TODO: return {
    //   preemptNum,
    //   state: PREEMPT_STATE.INACTIVE,
    //   stateLabel: "INACTIVE",
    //   source: "stub",
    // }
    // When _preemptActive is true and preemptNum === 1, use PREEMPT_STATE.PREEMPTING
  }

  async getPreemptChannelTimings(preemptNum) {
    // TODO: return realistic stub timing values matching the preemptTable columns:
    // { preemptNum, delay_s, minGreen_s, minDuration_s, maxOut_s,
    //   pedWalk_s, pedClear_s, yellow_s, red_s, source: "stub" }
    // Use MUTCD-compliant defaults (pedWalk=7, pedClear=11, yellow=4, red=2)
  }

  close() {}
}

// ── Base NTCIP 1202 Adapter ───────────────────────────────────────────────────
// All vendor adapters extend this class.  Overriding a method means the vendor
// path is tried first; fall back to super.method() on error.

class Ntcip1202Adapter {
  constructor(adapter) {
    this._adapter = adapter;
    this._session = buildSnmpSession(adapter);
    if (!this._session) throw new Error("net-snmp unavailable; use StubAdapter");
  }

  async probe() {
    // HINT: GET OID.controllerType (no instance suffix — it's a scalar)
    // Return { controllerType: string, supported: Object.keys(OID) }
  }

  async getPhaseStatus(signalGroup) {
    // HINT: instance OID = OID.phaseStatus + "." + signalGroup
    // Decode the bitmask using PHASE_BIT constants
    // Derive a human label: WALK > PED_CLEAR > GREEN > YELLOW > RED
  }

  async getTimingParameters(signalGroup) {
    // HINT: fetch all 6 phase timing OIDs with one snmpGet call (array of instance OIDs)
    // All raw values are tenths-of-second; divide by 10 before returning
  }

  async getPreemptionStatus() {
    // HINT: GET OID.unitPreemptState (scalar, no instance suffix)
    // Decode bits 0–7 as preemption inputs 1–8
    // For per-channel detail, prefer getPreemptChannelStatus(preemptNum) below
  }

  async sendPreemptionCall(signalGroup, options = {}) {
    // Preferred path: SET OID.preemptControlState + "." + signalGroup
    //   to PREEMPT_CONTROL.FORCE_ON (type = snmp.ObjectType.Integer)
    // Legacy fallback: read unitPreemptInput, OR in bit (signalGroup - 1),
    //   SET unitPreemptInput — only if preemptControlState SET fails (SNMP noSuchObject)
  }

  async clearPreemptionCall(signalGroup) {
    // Preferred path: SET OID.preemptControlState + "." + signalGroup
    //   to PREEMPT_CONTROL.FORCE_OFF (type = snmp.ObjectType.Integer)
    // Legacy fallback: read unitPreemptInput, AND with ~(1 << (signalGroup - 1)),
    //   SET unitPreemptInput — only if preemptControlState SET fails
  }

  async getMaxPreempts() {
    // HINT: GET OID.maxPreempts (scalar — already has the ".0" suffix)
    // Return { maxPreempts: number, source: "ntcip1202" }
  }

  async getPreemptChannelStatus(preemptNum) {
    // HINT: GET OID.preemptState + "." + preemptNum
    // Map raw integer to PREEMPT_STATE key for the stateLabel field
    // Return { preemptNum, state: raw, stateLabel, source: "ntcip1202" }
  }

  async getPreemptChannelTimings(preemptNum) {
    // HINT: fetch all 8 timing columns in one snmpGet call:
    //   [preemptDelay, preemptMinGreen, preemptMinDuration, preemptMaxOut,
    //    preemptPedWalk, preemptPedClear, preemptYellow, preemptRed]
    //   each appended with "." + preemptNum
    // All raw values are tenths-of-second; divide by 10 before returning
    // Return { preemptNum, delay_s, minGreen_s, minDuration_s, maxOut_s,
    //          pedWalk_s, pedClear_s, yellow_s, red_s, source: "ntcip1202" }
  }

  close() {
    // TODO: call this._session.close() if session exists
  }
}

// ── Siemens M60 + SEPAC Adapter ───────────────────────────────────────────────
// SEPAC is Siemens' firmware extension to NTCIP 1202.
// These OIDs are under Siemens' enterprise branch (1.3.6.1.4.1.449).
// HINT: Try SEPAC OIDs first; if the SNMP GET throws (OID not supported),
//       fall through to super.method() so non-SEPAC M60s still work.

const SIEMENS_OID = {
  // SEPAC preemption request — SET to signal group number to assert, 0 to clear
  sepacPreemptRequest: "1.3.6.1.4.1.449.1.1.1.2.1.0",
  // SEPAC preemption status — read-only, returns current active group or 0
  sepacPreemptStatus:  "1.3.6.1.4.1.449.1.1.1.2.2.0",
  // SEPAC active phase — integer signal group number currently in green
  sepacActivePhase:    "1.3.6.1.4.1.449.1.1.1.1.3.0",
};

class SiemensM60Adapter extends Ntcip1202Adapter {
  async getPhaseStatus(signalGroup) {
    // TODO: try snmpGet on SIEMENS_OID.sepacActivePhase;
    //       activePhase === signalGroup means GREEN
    //       on catch, fall back to super.getPhaseStatus(signalGroup)
  }

  async sendPreemptionCall(signalGroup, options = {}) {
    // TODO: SET SIEMENS_OID.sepacPreemptRequest to signalGroup (integer)
    //       on catch, fall back to super.sendPreemptionCall(...)
  }

  async getPreemptionStatus() {
    // TODO: GET SIEMENS_OID.sepacPreemptStatus; raw > 0 means active
    //       on catch, fall back to super.getPreemptionStatus()
  }
}

// ── Econolite ARIES/Cobalt Adapter ────────────────────────────────────────────
// Econolite uses a non-standard OID for preemption input.
// All other methods (phase status, timing) are standard NTCIP 1202.

const ECONOLITE_OID = {
  // Preemption input register — SET to signal group number to trigger
  preemptInput: "1.3.6.1.4.1.410.1.2.1.1.18.0",
};

class EconoliteAriesAdapter extends Ntcip1202Adapter {
  async sendPreemptionCall(signalGroup, options = {}) {
    // TODO: SET ECONOLITE_OID.preemptInput to signalGroup (integer)
    //       on catch, fall back to super.sendPreemptionCall(...)
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
// Peek ADA and generic_snmp are fully NTCIP-compliant; they map directly to
// Ntcip1202Adapter with no override needed.

const ADAPTER_MAP = {
  ntcip1202:       Ntcip1202Adapter,
  siemens_m60:     SiemensM60Adapter,
  econolite_aries: EconoliteAriesAdapter,
  peek_ada:        Ntcip1202Adapter,
  generic_snmp:    Ntcip1202Adapter,
};

const ControllerClientFactory = {
  /**
   * Build a controller client from a controller_adapters table row.
   * Always returns a valid object — unknown adapter_type falls back to
   * Ntcip1202Adapter; missing net-snmp falls back to StubAdapter.
   *
   * @param {Object} adapterRow  Row from controller_adapters
   * @returns {Ntcip1202Adapter|StubAdapter}
   */
  forAdapter(adapterRow) {
    if (!snmp) {
      console.warn("[ControllerClient] net-snmp unavailable — using stub");
      return new StubAdapter(adapterRow);
    }

    const AdapterClass = ADAPTER_MAP[adapterRow.adapter_type] ?? Ntcip1202Adapter;

    try {
      return new AdapterClass(adapterRow);
    } catch (err) {
      console.warn(`[ControllerClient] Init failed (${err.message}) — using stub`);
      return new StubAdapter(adapterRow);
    }
  },

  /**
   * Build a transient client from just an IP address.
   * Useful for one-off health checks without a full adapter row.
   *
   * @param {string} ipAddress
   * @param {Object} [opts]  { snmp_community, snmp_port, adapter_type, timeout_seconds }
   */
  forIp(ipAddress, opts = {}) {
    return ControllerClientFactory.forAdapter({
      ip_address:      ipAddress,
      snmp_port:       opts.snmp_port       ?? 161,
      snmp_community:  opts.snmp_community  ?? "public",
      adapter_type:    opts.adapter_type    ?? "ntcip1202",
      timeout_seconds: opts.timeout_seconds ?? 5,
      retry_count:     opts.retry_count     ?? 2,
    });
  },
};

module.exports = { ControllerClientFactory, OID, PHASE_BIT, PREEMPT_STATE, PREEMPT_CONTROL };
