-- Migration: Add controller_ip column to preemption_zone_configs
-- Purpose: Support optional Controller IP field for preemption zone configuration

ALTER TABLE preemption_zone_configs
ADD COLUMN controller_ip VARCHAR(255);

-- Add index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_preemption_zone_configs_controller_ip
    ON preemption_zone_configs(controller_ip);
