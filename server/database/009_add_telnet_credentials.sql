-- Migration 009: Add Telnet credential columns to controller_adapters
-- Enables Telnet-based connectivity for controllers that support it (e.g. Siemens M60).
-- SNMP remains the primary protocol; Telnet is additive.

ALTER TABLE controller_adapters ADD COLUMN IF NOT EXISTS
  telnet_port     INT          DEFAULT 23;

ALTER TABLE controller_adapters ADD COLUMN IF NOT EXISTS
  telnet_username VARCHAR(128);

ALTER TABLE controller_adapters ADD COLUMN IF NOT EXISTS
  telnet_password VARCHAR(256);

ALTER TABLE controller_adapters ADD COLUMN IF NOT EXISTS
  connection_mode VARCHAR(20)  DEFAULT 'snmp'
    CHECK (connection_mode IN ('snmp', 'telnet', 'both'));
