-- Migration 010: Fix connection_mode check constraint on controller_adapters
-- Migration 009 was updated after its initial run, so the DB retained the old
-- constraint that only allowed 'snmp'. This migration replaces it with the
-- correct set: snmp | telnet | both.

ALTER TABLE controller_adapters
  DROP CONSTRAINT IF EXISTS controller_adapters_connection_mode_check;

ALTER TABLE controller_adapters
  ADD CONSTRAINT controller_adapters_connection_mode_check
    CHECK (connection_mode IN ('snmp', 'telnet', 'both'));
