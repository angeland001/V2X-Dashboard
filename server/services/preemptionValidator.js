/**
 * Preemption Safety Validator
 *
 * Before any preemption command is sent to a controller this validator
 * runs a sequence of checks derived from:
 *
 *   NEMA TS2 §4.2.5  — minimum green time before phase interruption
 *   NEMA TS2 §6.3.2  — pedestrian phase must be allowed to clear
 *   MUTCD 4E.08      — pedestrian clearance interval requirement
 *   MUTCD 4E.09      — walk interval minimum
 *
 * Usage:
 *
 *   const validator = new PreemptionValidator(controllerClient, timingConstraints);
 *   const result    = await validator.validate(signalGroup);
 *
 *   if (result.approved) {
 *     // safe to issue preemption command
 *   } else {
 *     // result.violations contains the blocking reasons
 *   }
 *
 * timingConstraints shape (from controller_timing_constraints row):
 *   {
 *     min_green_before_preempt_s,  // minimum green before cut-in is allowed
 *     ped_walk_interval_s,          // minimum walk display time
 *     ped_clearance_interval_s,     // minimum flashing don't walk time
 *     yellow_change_interval_s,     // yellow change required before red
 *     all_red_clearance_s,          // all-red after yellow before preempt green
 *     preempt_green_hold_s,         // duration preemption green is held
 *     max_preempt_duration_s,       // hard cap on total preemption time
 *     min_call_interval_s,          // cooldown between successive calls
 *   }
 *
 * controllerClient is any adapter returned by ControllerClientFactory — it must
 * implement getPhaseStatus(signalGroup) and getTimingParameters(signalGroup).
 */

const db = require("../database/postgis");

class PreemptionValidator {
  /**
   * @param {Object} controllerClient  Any adapter from ControllerClientFactory
   * @param {Object} timingConstraints Row from controller_timing_constraints
   */
  constructor(controllerClient, timingConstraints) {
    this._client      = controllerClient;
    this._constraints = timingConstraints;
  }

  /**
   * Run all safety checks for the given signal group.
   *
   * Returns a result object:
   * {
   *   approved:   boolean,
   *   violations: string[],   // empty when approved
   *   warnings:   string[],   // non-blocking cautions
   *   phaseState: Object,     // raw getPhaseStatus result
   *   liveTimings: Object,    // raw getTimingParameters result
   * }
   *
   * @param {number} signalGroup
   * @param {Object} [context]  Optional extra context (e.g. { triggeredBy })
   */
  async validate(signalGroup, context = {}) {
    const violations = [];
    const warnings   = [];

    let phaseState   = null;
    let liveTimings  = null;

    // ── Step 1: Fetch live phase state from controller ──────────────────────
    // HINT: call this._client.getPhaseStatus(signalGroup)
    // Wrap in try/catch — a controller comms failure is itself a blocking violation
    // TODO: implement

    // ── Step 2: Pedestrian phase clearance check (MUTCD 4E.08 / NEMA TS2 §6.3.2) ──
    // If the phase is currently in WALK or PED_CLEAR state it must be allowed
    // to complete its full clearance interval before preemption can interrupt.
    // HINT: check phaseState.walk or phaseState.pedClear
    // HINT: push a violation string like:
    //   "Pedestrian phase active — clearance interval must complete before preemption"
    // TODO: implement

    // ── Step 3: Minimum green time check (NEMA TS2 §4.2.5) ─────────────────
    // If the phase is in MIN_GREEN state the minimum green has not elapsed yet.
    // Preemption cannot interrupt until min-green completes.
    // HINT: check phaseState.minGreen
    // TODO: implement

    // ── Step 4: Fetch live timing parameters and compare against constraints ─
    // HINT: call this._client.getTimingParameters(signalGroup)
    // Compare each live value against the corresponding constraint field.
    // If the controller reports a walk interval shorter than ped_walk_interval_s
    // that is a warning (controller may be misconfigured).
    // TODO: implement

    // ── Step 5: Cooldown check — minimum time between successive calls ───────
    // Query preemption_command_log for the most recent confirmed/sent entry for
    // this zone config and check whether min_call_interval_s has elapsed.
    // HINT: SELECT MAX(sent_at) FROM preemption_command_log WHERE ...
    //       compare (NOW() - sent_at) in seconds against min_call_interval_s
    // TODO: implement

    // ── Step 6: Phase is RED — preemption is safe to send immediately ────────
    // If the phase is already red there are no pedestrian or green-time concerns.
    // HINT: if phaseState.red is true and no other violations, add a note to warnings
    //       that this is a red-phase call (lowest disruption)
    // TODO: implement

    return {
      approved:    violations.length === 0,
      violations,
      warnings,
      phaseState,
      liveTimings,
    };
  }
}

/**
 * Convenience helper — load timing constraints for a preemption zone config
 * from the database.  Returns null if no constraints row exists.
 *
 * @param {number} preemptionZoneConfigId
 * @returns {Promise<Object|null>}
 */
async function loadTimingConstraints(preemptionZoneConfigId) {
  // TODO: SELECT * FROM controller_timing_constraints WHERE preemption_zone_config_id = $1
  // return result.rows[0] || null
}

/**
 * Convenience helper — load the controller_adapters row for a given preemption
 * zone config by joining through the controller_ip field.
 *
 * @param {number} preemptionZoneConfigId
 * @returns {Promise<Object|null>}
 */
async function loadAdapterForZoneConfig(preemptionZoneConfigId) {
  // HINT: JOIN preemption_zone_configs pzc ON pzc.controller_ip = ca.ip_address
  //       WHERE pzc.id = preemptionZoneConfigId
  // TODO: implement query, return result.rows[0] || null
}

module.exports = { PreemptionValidator, loadTimingConstraints, loadAdapterForZoneConfig };
