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
 *
 * Install: cd server && npm install net-snmp
 */

const snmp = require("net-snmp");

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
  // Adapter row (Each row of controller_adapters table) has: { ip_address, snmp_port, snmp_community, timeout_seconds }
  // HINT: snmp.Version2c is the right version for NTCIP 1202 deployments
  // snmp.createSession(host, community, options) returns a session object
  // TODO: implement using net-snmp session options from the adapter row
  const ip = adapter.ip_address;
  const community = adapter.snmp_community || "public";
  const snmp_port = adapter.snmp_port || 161;
  const timeout = (adapter.timeout_seconds || 5) * 1000;  // convert to ms
  const retryCount = adapter.retry_count || 2;

  return snmp.createSession(ip, community);

 
}

// ── Promisified SNMP wrappers ─────────────────────────────────────────────────
// HINT: net-snmp uses callbacks; wrap them in Promises for async/await usage.
// session.get(oids, callback(err, varbinds)) — varbinds is an array of { oid, value }
// session.set(varbinds, callback(err))       — each varbind needs { oid, type, value }
// Use snmp.isVarbindError(vb) to check for per-OID errors in the get response

function snmpGet(session, oids) {
  // TODO: wrap session.get in a Promise, resolve with { oid: value } map
  return new Promise((resolve, reject) => {
    session.get(oids, (err, varbinds) => {
      if (err) {
        console.log("SNMP GET error:", err);
        reject(err);
      } else {
        const result = {};
        varbinds.forEach(varbind => {
          if (snmp.isVarbindError(varbind)) {
            reject(snmp.varbindError(varbind));
            return;
          }
          result[varbind.oid] = varbind.value;
        });
        resolve(result);
      }
    });
  });
}

function snmpSet(session, varbinds) {
  return new Promise((resolve, reject) => {
    session.set(varbinds, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
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
    const result = await snmpGet(this._session, [OID.controllerType]);
    // OID.controllerType is already "1.3.6.1.2.1.1.1.0" - Scalar no instance suffix needed.

    const rawValue = result[ OID.controllerType]
    // net-snmp returns a buffer for OctetString; convert to a readable string
    const controllerType = rawValue.toString();

    return {
      controllerType: controllerType,   // Example: "Siemens M60", "Econolite Cobalt", "Generic SNMP Controller"
      supported: Object.keys(OID),      // list of all OID keys this adapter knows
    }

    
  }

  async getPhaseStatus(signalGroup) {
    // HINT: instance OID = OID.phaseStatus + "." + signalGroup
    // Decode the bitmask using PHASE_BIT constants
    // Derive a human label: WALK > PED_CLEAR > GREEN > YELLOW > RED
    const oid = OID.phaseStatus + "." + signalGroup;
    const result = await snmpGet(this._session, [oid]);
    const raw = result[oid];

    const flags = {
      walk: !!(raw & PHASE_BIT.WALK),
      pedClear: !!(raw & PHASE_BIT.PED_CLEAR),
      minGreen: !!(raw & PHASE_BIT.MIN_GREEN),
      green: !!(raw & PHASE_BIT.GREEN),
      yellow: !!(raw & PHASE_BIT.YELLOW),
      redClear: !!(raw & PHASE_BIT.RED_CLEAR),
      red: !!(raw & PHASE_BIT.RED),
      next: !!(raw & PHASE_BIT.NEXT),
    }

    let label = "";
    switch (true) {
      case flags.walk:
        label = "WALK";
        break;
      case flags.pedClear:
        label = "PED_CLEAR";
        break;
      case flags.green:
        label = "GREEN";
        break;
      case flags.yellow:
        label = "YELLOW";
        break;
      default:
        label = "RED";
    }

    return {
      signalGroup,
      raw,
      flags,
      label, 
    }

  }

  // Purpose: Reads all 6 timing intervals for a specific signal phase from the controller in a single SNMP round-trip. 
  // These values define how long each light interval lasts (green, yellow, walk, etc.) and are used to validate timing plans or display configuration in the UI
  async getTimingParameters(signalGroup) {
    // HINT: fetch all 6 phase timing OIDs with one snmpGet call (array of instance OIDs)

    const oids = [
      OID.phaseMinGreen + "." + signalGroup,
      OID.phaseMaxGreen + "." + signalGroup,
      OID.phaseWalk + "." + signalGroup,
      OID.phasePedestrianClear + "." + signalGroup,
      OID.phaseYellowChange + "." + signalGroup,
      OID.phaseRedClearance + "." + signalGroup,
    ];

    // One network call fetches all 6 at once
    const result = await snmpGet(this._session, oids);

    // All raw values are tenths-of-second; divide by 10 before returning
    return {
      signalGroup,
      minGreen_s: result[oids[0]] / 10,
      maxGreen_s: result[oids[1]] / 10,
      walk_s: result[oids[2]] / 10,
      pedClear_s: result[oids[3]] / 10,
      yellowChange_s: result[oids[4]] / 10,
      redClearance_s: result[oids[5]] / 10,
    }
  }

  async getPreemptionStatus() {
    // HINT: GET OID.unitPreemptState (scalar, no instance suffix)
    // Decode bits 0–7 as preemption inputs 1–8
    // For per-channel detail, prefer getPreemptChannelStatus(preemptNum) below
      const result = await snmpGet(this._session, [OID.unitPreemptState]);
      const raw = result[OID.unitPreemptState]; //integer bitmask, bits 0-7

      // Bit N-1 corresponds to preempt input N (1-indexed)
      const inputs = {};
      for (let n = 1; n <= 8; n++) {
        inputs[n] = !!(raw & (1 << (n - 1)));
      }
      return {
        raw,
        inputs,
        active: Object.keys(inputs)
          .filter((n) => inputs[n])
          .map(Number),
      };

  }
  // Asserts a preemption request on a specific signal channel — this is what you call to give a train/emergency vehicle a green light. 
  // It tries the modern per-channel NTCIP command first, then falls back to the older bitmask register for controllers with outdated
  // firmware.        
  async sendPreemptionCall(signalGroup, options = {}) {
    // Preferred path: SET OID.preemptControlState + "." + signalGroup
    //   to PREEMPT_CONTROL.FORCE_ON (type = snmp.ObjectType.Integer)
    // Legacy fallback: read unitPreemptInput, OR in bit (signalGroup - 1),
    //   SET unitPreemptInput — only if preemptControlState SET fails (SNMP noSuchObject)

    const controlOid = OID.preemptControlState + "." + signalGroup;
    try {
      //preferred path - modern NTCIP 1202 6.3 per channel command
      await snmpSet(this._session, [{
        oid: controlOid,
        type: snmp.ObjectType.Integer,
        value: PREEMPT_CONTROL.FORCE_ON // = 2
      }])
    }
    catch (err){
      //// Legacy fallback — only if controller doesn't support preemptControlState
      // (older firmware returns noSuchObject for that OID)

      // Read current bitmask
      const result = await snmpGet(this._session, [OID.unitPreemptInput]);
      const current = result[OID.unitPreemptInput];

      // Or in the bit for this channel (bit N-1 for channel N)
      const updated = current | (1 << (signalGroup - 1))

      // write the updated bitmask back to the controller to trigger the preempt`
      await snmpSet(this._session, [{
        oid: OID.unitPreemptInput,
        type: snmp.ObjectType.Integer,
        value: updated
      }])

    }  
  }

  async clearPreemptionCall(signalGroup) {
    // Mirror of sendPreemptionCall — cancels an active preempt request on this channel.
    // Same two-path strategy: modern per-channel command first, bitmask fallback second.
    const controlOid = OID.preemptControlState + "." + signalGroup;
    try {
      // Preferred path — tell the controller to exit preempt on this channel
      await snmpSet(this._session, [{
        oid:   controlOid,
        type:  snmp.ObjectType.Integer,
        value: PREEMPT_CONTROL.FORCE_OFF,  // = 3
      }]);
    } catch (err) {
      // Legacy fallback — read the bitmask, clear only this channel's bit, write back
      const result = await snmpGet(this._session, [OID.unitPreemptInput]);
      const current = result[OID.unitPreemptInput];

      // AND with the bitwise complement to zero out only bit (signalGroup - 1)
      const updated = current & ~(1 << (signalGroup - 1));

      await snmpSet(this._session, [{
        oid:   OID.unitPreemptInput,
        type:  snmp.ObjectType.Integer,
        value: updated,
      }]);
    }
  }

  async getMaxPreempts() {
    // Queries how many preemption channels this controller supports.
    // Used at startup to know the valid range for preemptNum (1 to maxPreempts).
    // OID.maxPreempts already has the ".0" scalar suffix — no instance append needed.
    const result = await snmpGet(this._session, [OID.maxPreempts]);
    return {
      maxPreempts: result[OID.maxPreempts],
      source: "ntcip1202",
    };
  }

  async getPreemptChannelStatus(preemptNum) {
    // Returns the live status of a single preemption channel.
    // More precise than getPreemptionStatus() which only gives a unit-level bitmask.
    const oid = OID.preemptState + "." + preemptNum;
    const result = await snmpGet(this._session, [oid]);
    const raw = result[oid];

    // Reverse-lookup the PREEMPT_STATE key by matching the raw integer value
    const stateLabel = Object.keys(PREEMPT_STATE).find(
      (key) => PREEMPT_STATE[key] === raw
    ) ?? "UNKNOWN";

    return {
      preemptNum,
      state: raw,
      stateLabel,   // "INACTIVE" | "PREEMPTING" | "LINKED_PREEMPT_WAITING"
      source: "ntcip1202",
    };
  }

  async getPreemptChannelTimings(preemptNum) {
    // Reads all 8 timing parameters for a preemption channel in one SNMP round-trip.
    // Used to display or validate preempt timing plans in the UI.
    const oids = [
      OID.preemptDelay       + "." + preemptNum,
      OID.preemptMinGreen    + "." + preemptNum,
      OID.preemptMinDuration + "." + preemptNum,
      OID.preemptMaxOut      + "." + preemptNum,
      OID.preemptPedWalk     + "." + preemptNum,
      OID.preemptPedClear    + "." + preemptNum,
      OID.preemptYellow      + "." + preemptNum,
      OID.preemptRed         + "." + preemptNum,
    ];

    const result = await snmpGet(this._session, oids);

    // All raw values are tenths-of-second; divide by 10 to return seconds
    return {
      preemptNum,
      delay_s:       result[oids[0]] / 10,
      minGreen_s:    result[oids[1]] / 10,
      minDuration_s: result[oids[2]] / 10,
      maxOut_s:      result[oids[3]] / 10,
      pedWalk_s:     result[oids[4]] / 10,
      pedClear_s:    result[oids[5]] / 10,
      yellow_s:      result[oids[6]] / 10,
      red_s:         result[oids[7]] / 10,
      source: "ntcip1202",
    };
  }

  close() {
    // Frees the underlying SNMP UDP socket — call when done with this adapter
    // to avoid dangling open handles that block process exit.
    if (this._session) this._session.close();
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
    // SEPAC exposes a single "active phase" scalar rather than a bitmask table.
    // If this OID isn't present (non-SEPAC M60), fall back to the standard NTCIP path.
    try {
      const result = await snmpGet(this._session, [SIEMENS_OID.sepacActivePhase]);
      const activePhase = result[SIEMENS_OID.sepacActivePhase];

      // SEPAC tells us exactly which phase is green; everything else is red.
      const isGreen = activePhase === signalGroup;
      return {
        signalGroup,
        raw: activePhase,
        flags: { green: isGreen, red: !isGreen },
        label: isGreen ? "GREEN" : "RED",
        source: "siemens_sepac",
      };
    } catch (err) {
      return super.getPhaseStatus(signalGroup);
    }
  }

  async sendPreemptionCall(signalGroup, options = {}) {
    // SEPAC uses a single integer register: write the channel number to request preempt.
    // On failure (OID absent), fall back to the standard NTCIP two-path logic.
    try {
      await snmpSet(this._session, [{
        oid:   SIEMENS_OID.sepacPreemptRequest,
        type:  snmp.ObjectType.Integer,
        value: signalGroup,
      }]);
    } catch (err) {
      return super.sendPreemptionCall(signalGroup, options);
    }
  }

  async getPreemptionStatus() {
    // SEPAC status register returns the active channel number, or 0 if none.
    // On failure fall back to the standard NTCIP bitmask approach.
    try {
      const result = await snmpGet(this._session, [SIEMENS_OID.sepacPreemptStatus]);
      const raw = result[SIEMENS_OID.sepacPreemptStatus];
      return {
        raw,
        active: raw > 0 ? [raw] : [],   // SEPAC only supports one active preempt at a time
        source: "siemens_sepac",
      };
    } catch (err) {
      return super.getPreemptionStatus();
    }
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
    // Econolite ARIES/Cobalt uses a proprietary preempt input register instead of
    // the NTCIP preemptControlState table — write the channel number directly to it.
    // On failure, fall back to the standard NTCIP two-path logic.
    try {
      await snmpSet(this._session, [{
        oid:   ECONOLITE_OID.preemptInput,
        type:  snmp.ObjectType.Integer,
        value: signalGroup,
      }]);
    } catch (err) {
      return super.sendPreemptionCall(signalGroup, options);
    }
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
    const AdapterClass = ADAPTER_MAP[adapterRow.adapter_type] ?? Ntcip1202Adapter;
    return new AdapterClass(adapterRow);
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
