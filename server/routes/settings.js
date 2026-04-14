const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/postgis');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const DEFAULT_USER_SETTINGS = {
  theme: 'system',
  sidebarCollapsed: false,
  refreshInterval: 30,
  exportFormat: 'csv',
  timezone: 'America/Chicago',
};

const DEFAULT_GLOBAL_SETTINGS = {
  alertThreshold: 80,
  emailNotifications: true,
  sessionTimeout: 30,
};

const ALLOWED_USER_KEYS = new Set([
  'theme',
  'sidebarCollapsed',
  'refreshInterval',
  'exportFormat',
  'timezone',
  'autoRefresh',
  'includeRawData',
  'defaultDashboard',
  'gridView',
  'compactView',
  'expandedView',
  'colorPalette',
  'showDataLabels',
  'dateFormat',
  'thresholdAlertsEnabled',
  'trafficDropEnabled',
  'trafficDropValue',
  'trafficSpikeEnabled',
  'trafficSpikeValue',
  'priorityLow',
  'priorityMedium',
  'priorityHigh',
]);

const ALLOWED_GLOBAL_KEYS = new Set([
  'alertThreshold',
  'emailNotifications',
  'sessionTimeout',
]);

let tablesInitialized = false;

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role || 'user' };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const sanitizeSettings = (input, allowedKeys) => {
  const source = input && typeof input === 'object' ? input : {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (allowedKeys.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const ensureSettingsTables = async () => {
  if (tablesInitialized) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS global_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT global_settings_singleton CHECK (id = 1)
    );
  `);

  await db.query(`
    INSERT INTO global_settings (id, settings)
    VALUES (1, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);

  tablesInitialized = true;
};

router.get('/merged', authenticate, async (req, res) => {
  try {
    await ensureSettingsTables();

    const [userResult, globalResult] = await Promise.all([
      db.query('SELECT settings FROM user_settings WHERE user_id = $1', [req.user.id]),
      db.query('SELECT settings FROM global_settings WHERE id = 1'),
    ]);

    const userSettings = {
      ...DEFAULT_USER_SETTINGS,
      ...(userResult.rows[0]?.settings || {}),
    };

    const globalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...(globalResult.rows[0]?.settings || {}),
    };

    res.json({
      user: userSettings,
      global: globalSettings,
      merged: { ...globalSettings, ...userSettings },
    });
  } catch (error) {
    console.error('Failed to fetch merged settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/user', authenticate, async (req, res) => {
  try {
    await ensureSettingsTables();

    const sanitized = sanitizeSettings(req.body, ALLOWED_USER_KEYS);

    const result = await db.query(
      `
      INSERT INTO user_settings (user_id, settings)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET
        settings = user_settings.settings || EXCLUDED.settings,
        updated_at = NOW()
      RETURNING settings;
      `,
      [req.user.id, JSON.stringify(sanitized)]
    );

    res.json({ success: true, settings: result.rows[0]?.settings || {} });
  } catch (error) {
    console.error('Failed to update user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

router.put('/global', authenticate, async (req, res) => {
  try {
    await ensureSettingsTables();

    const sanitized = sanitizeSettings(req.body, ALLOWED_GLOBAL_KEYS);

    const result = await db.query(
      `
      UPDATE global_settings
      SET settings = settings || $1::jsonb,
          updated_at = NOW()
      WHERE id = 1
      RETURNING settings;
      `,
      [JSON.stringify(sanitized)]
    );

    res.json({ success: true, settings: result.rows[0]?.settings || {} });
  } catch (error) {
    console.error('Failed to update global settings:', error);
    res.status(500).json({ error: 'Failed to update global settings' });
  }
});

module.exports = router;
