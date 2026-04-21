-- ============================================================
-- Migration 008: NTCIP Controller Abstraction Layer
--
-- Adds two tables:
--   controller_adapters       — one row per physical controller,
--                               stores vendor/protocol/connection details
--   controller_timing_constraints — pedestrian and preemption timing
--                               bounds per preemption_zone_config,
--                               enforced by the preemption validator
-- ============================================================

-- ── 1. CONTROLLER_ADAPTERS ────────────────────────────────────
-- Each row represents one physical traffic signal controller.
-- The 'adapter_type' column identifies the vendor-specific
-- adapter to load (ntcip1202, siemens_m60, econolite, peek, aries).
-- Connection to preemption_zone_configs is via controller_ip,
-- which already exists on that table.

CREATE TABLE IF NOT EXISTS controller_adapters (
    id              SERIAL PRIMARY KEY,
    intersection_id INTEGER NOT NULL REFERENCES intersections(intersection_id) ON DELETE CASCADE,
    -- Human label, e.g. "MLK & Main — Siemens M60 #1"
    label           VARCHAR(255) NOT NULL,
    -- IP or hostname of the controller management port
    ip_address      VARCHAR(255) NOT NULL,
    -- SNMP port (NTCIP default 161)
    snmp_port       INTEGER NOT NULL DEFAULT 161,
    -- SNMP community string (read-only for polling, read-write for commands)
    snmp_community  VARCHAR(128) NOT NULL DEFAULT 'public',
    -- Identifies which adapter module handles vendor quirks
    -- Values: ntcip1202 | siemens_m60 | econolite_aries | peek_ada | generic_snmp
    adapter_type    VARCHAR(64) NOT NULL DEFAULT 'ntcip1202',
    -- Firmware / software version string, informational
    firmware_version VARCHAR(64),
    -- Supported NTCIP objects as a JSON array of OID strings,
    -- populated on first successful probe
    supported_oids  JSONB DEFAULT '[]'::jsonb,
    -- Max seconds to wait for an SNMP response before timeout
    timeout_seconds INTEGER NOT NULL DEFAULT 5,
    -- Number of SNMP retries before marking controller offline
    retry_count     INTEGER NOT NULL DEFAULT 2,
    -- active | offline | maintenance
    connection_status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT controller_adapters_ip_unique UNIQUE (ip_address)
);

CREATE INDEX IF NOT EXISTS idx_controller_adapters_intersection
    ON controller_adapters(intersection_id);
CREATE INDEX IF NOT EXISTS idx_controller_adapters_ip
    ON controller_adapters(ip_address);
CREATE INDEX IF NOT EXISTS idx_controller_adapters_status
    ON controller_adapters(connection_status);

DROP TRIGGER IF EXISTS trg_controller_adapters_updated ON controller_adapters;
CREATE TRIGGER trg_controller_adapters_updated
    BEFORE UPDATE ON controller_adapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 2. CONTROLLER_TIMING_CONSTRAINTS ─────────────────────────
-- Per preemption-zone timing bounds.
-- The preemption validator reads these before issuing any
-- preemption command to verify the requested timing is safe
-- under NEMA TS2 and MUTCD pedestrian clearance rules.

CREATE TABLE IF NOT EXISTS controller_timing_constraints (
    id                          SERIAL PRIMARY KEY,
    preemption_zone_config_id   INTEGER NOT NULL
        REFERENCES preemption_zone_configs(id) ON DELETE CASCADE,
    -- Minimum green time (seconds) before a preemption call is
    -- allowed to cut the phase — prevents stranding pedestrians
    -- mid-crossing (MUTCD 4E.09 / NEMA TS2 §6.3.2)
    min_green_before_preempt_s  NUMERIC(5,1) NOT NULL DEFAULT 7.0,
    -- Pedestrian walk interval (seconds) — used to check whether
    -- a ped phase is active and must be allowed to clear
    ped_walk_interval_s         NUMERIC(5,1) NOT NULL DEFAULT 7.0,
    -- Pedestrian clearance interval (seconds) — flashing don't walk
    -- before the signal can change (MUTCD 4E.08)
    ped_clearance_interval_s    NUMERIC(5,1) NOT NULL DEFAULT 11.0,
    -- Yellow change interval for the preemption approach (seconds)
    yellow_change_interval_s    NUMERIC(5,1) NOT NULL DEFAULT 4.0,
    -- All-red clearance after yellow before the preemption phase
    -- takes effect (NEMA TS2 §4.2.5)
    all_red_clearance_s         NUMERIC(5,1) NOT NULL DEFAULT 2.0,
    -- How long the preemption green phase is held (seconds)
    preempt_green_hold_s        NUMERIC(5,1) NOT NULL DEFAULT 20.0,
    -- Maximum total preemption duration before automatic return
    -- to normal coordination (seconds)
    max_preempt_duration_s      NUMERIC(5,1) NOT NULL DEFAULT 60.0,
    -- Minimum time (seconds) between successive preemption calls
    -- on this zone — prevents controller thrashing
    min_call_interval_s         NUMERIC(5,1) NOT NULL DEFAULT 30.0,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT timing_constraints_zone_unique
        UNIQUE (preemption_zone_config_id)
);

CREATE INDEX IF NOT EXISTS idx_timing_constraints_zone
    ON controller_timing_constraints(preemption_zone_config_id);

DROP TRIGGER IF EXISTS trg_timing_constraints_updated ON controller_timing_constraints;
CREATE TRIGGER trg_timing_constraints_updated
    BEFORE UPDATE ON controller_timing_constraints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 3. PREEMPTION_COMMAND_LOG ─────────────────────────────────
-- Append-only audit trail of every preemption command issued,
-- with outcome and validator result. Supports incident review
-- and satisfies MUTCD documentation requirements.

CREATE TABLE IF NOT EXISTS preemption_command_log (
    id                          SERIAL PRIMARY KEY,
    preemption_zone_config_id   INTEGER NOT NULL
        REFERENCES preemption_zone_configs(id) ON DELETE CASCADE,
    controller_adapter_id       INTEGER
        REFERENCES controller_adapters(id) ON DELETE SET NULL,
    -- who triggered: 'operator', 'api', 'scheduler'
    triggered_by                VARCHAR(64) NOT NULL DEFAULT 'operator',
    -- user_id if triggered by a human via UI
    user_id                     INTEGER,
    -- pending | validated | sent | confirmed | failed | rejected
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- JSON object returned by preemptionValidator
    validator_result            JSONB DEFAULT '{}'::jsonb,
    -- raw SNMP PDU sent to controller, base64 encoded
    raw_command                 TEXT,
    -- SNMP response from controller
    raw_response                TEXT,
    -- human-readable failure reason if status = failed | rejected
    error_message               TEXT,
    requested_at                TIMESTAMPTZ DEFAULT NOW(),
    sent_at                     TIMESTAMPTZ,
    confirmed_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_preempt_log_zone
    ON preemption_command_log(preemption_zone_config_id);
CREATE INDEX IF NOT EXISTS idx_preempt_log_status
    ON preemption_command_log(status);
CREATE INDEX IF NOT EXISTS idx_preempt_log_requested_at
    ON preemption_command_log(requested_at DESC);
