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
// Append ".N" where N is the phase/signal-group number (1-indexed).
// Vendor-specific OIDs are defined inside the per-adapter sections below.
const OID = {
  // Phase current state bitmask — see PHASE_BIT below for decode
  // HINT: GET this.OID.phaseStatus + "." + signalGroup to read one phase
  phaseStatus:           "1.3.6.1.4.1.1206.4.2.1.1.4.1.3",

  // Timing parameters — all values in tenths of a second, divide by 10 for seconds
  phaseMinGreen:         "1.3.6.1.4.1.1206.4.2.1.1.4.1.6",
  phaseMaxGreen:         "1.3.6.1.4.1.1206.4.2.1.1.4.1.7",
  phaseWalk:             "1.3.6.1.4.1.1206.4.2.1.1.4.1.10",
  phasePedestrianClear:  "1.3.6.1.4.1.1206.4.2.1.1.4.1.11",
  phaseYellowChange:     "1.3.6.1.4.1.1206.4.2.1.1.4.1.12",
  phaseRedClearance:     "1.3.6.1.4.1.1206.4.2.1.1.4.1.13",

  // Preemption — unitPreemptState is read-only bitmask of active inputs;
  // unitPreemptInput is writable — SET the bit for the desired input to assert
  // HINT: bit N-1 corresponds to preemption input N (input 1 = bit 0)
  unitPreemptState:      "1.3.6.1.4.1.1206.4.2.1.1.1.1.11",
  unitPreemptInput:      "1.3.6.1.4.1.1206.4.2.1.1.1.1.12",

  // Controller identification string (same as sysDescr)
  controllerType:        "1.3.6.1.2.1.1.1.0",
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
  }

  async sendPreemptionCall(signalGroup, options = {}) {
    // HINT: read current unitPreemptInput value, OR in the bit for signalGroup,
    // then SET unitPreemptInput to the new value (type = snmp.ObjectType.Integer)
    // bit index = signalGroup - 1
  }

  async clearPreemptionCall(signalGroup) {
    // HINT: same as sendPreemptionCall but AND with the inverted bit mask (~inputBit)
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

module.exports = { ControllerClientFactory, OID, PHASE_BIT };
