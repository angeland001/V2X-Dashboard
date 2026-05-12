-- ============================================================
-- Migration 009: SNMPv3 Support for Controller Adapters
--
-- Adds SNMPv3 authentication/privacy columns to controller_adapters.
-- Existing rows keep snmp_version = 'v2c' (the default) and all
-- v3 columns remain NULL, so nothing breaks.
-- ============================================================

ALTER TABLE controller_adapters
  ADD COLUMN IF NOT EXISTS snmp_version         VARCHAR(4)  NOT NULL DEFAULT 'v2c',
  ADD COLUMN IF NOT EXISTS snmp_v3_security_level VARCHAR(20),   -- noAuthNoPriv | authNoPriv | authPriv
  ADD COLUMN IF NOT EXISTS snmp_v3_username     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS snmp_v3_auth_protocol VARCHAR(10),    -- md5 | sha | sha256 | sha384 | sha512
  ADD COLUMN IF NOT EXISTS snmp_v3_auth_key     TEXT,            -- passphrase or hex key (sensitive)
  ADD COLUMN IF NOT EXISTS snmp_v3_priv_protocol VARCHAR(10),    -- des | aes | aes256b | aes256r
  ADD COLUMN IF NOT EXISTS snmp_v3_priv_key     TEXT;            -- passphrase or hex key (sensitive)

COMMENT ON COLUMN controller_adapters.snmp_v3_auth_key IS 'Sensitive: excluded from GET responses';
COMMENT ON COLUMN controller_adapters.snmp_v3_priv_key IS 'Sensitive: excluded from GET responses';
