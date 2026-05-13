const express = require('express');
const http = require('http');
const crypto = require('crypto');
const db = require('../../../database/postgis');
const authenticate = require('../../../middleware/authenticate');

const router = express.Router();

const CAMERA_USERNAME = process.env.CAMERA_USERNAME;
const CAMERA_PASSWORD = process.env.CAMERA_PASSWORD;

// ── Digest auth helpers ──────────────────────────────────────────────────────

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseDigestChallenge(header) {
  const params = {};
  const re = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
  let m;
  while ((m = re.exec(header)) !== null) {
    params[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return params;
}

function buildDigestAuth(username, password, method, uri, wwwAuthHeader) {
  const { realm, nonce, qop, opaque } = parseDigestChallenge(wwwAuthHeader);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = (qop === 'auth' || qop === 'auth-int')
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  const parts = [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  if (opaque) parts.push(`opaque="${opaque}"`);
  return parts.join(', ');
}

/**
 * Makes an HTTP GET to the camera with automatic Digest auth:
 * 1. First request — no auth
 * 2. If 401 → parse challenge, retry with Digest Authorization header
 * Calls onSuccess(nodeRes) with the final 200 response stream.
 * Calls onError(statusCode, message) on failure.
 */
function cameraGet(hostname, port, path, onSuccess, onError) {
  const opts = { hostname, port, path };

  const firstReq = http.get(opts, (firstRes) => {
    if (firstRes.statusCode === 200) {
      return onSuccess(firstRes, firstReq);
    }

    if (firstRes.statusCode === 401) {
      const wwwAuth = firstRes.headers['www-authenticate'] || '';
      // Must consume the 401 body to free the socket before the second request
      firstRes.resume();

      const authHeader = buildDigestAuth(CAMERA_USERNAME, CAMERA_PASSWORD, 'GET', path, wwwAuth);
      console.log(`[camera-stream] retrying with Digest auth`);

      const secondReq = http.get(
        { ...opts, headers: { Authorization: authHeader } },
        (secondRes) => {
          if (secondRes.statusCode === 200) return onSuccess(secondRes, secondReq);
          secondReq.destroy();
          onError(secondRes.statusCode, `Camera returned ${secondRes.statusCode} after Digest auth`);
        }
      );
      secondReq.on('error', (err) => onError(502, err.message));
      return;
    }

    firstReq.destroy();
    onError(firstRes.statusCode, `Camera returned ${firstRes.statusCode}`);
  });

  firstReq.on('error', (err) => onError(502, err.message));
}

// ============================================================
// CRUD Endpoints (all authenticate-protected)
// ============================================================

/**
 * GET /api/cameras
 * List all cameras with intersection name joined
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, i.name as intersection_name
       FROM cameras c
       LEFT JOIN intersections i ON i.intersection_id = c.intersection_id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cameras/by-intersection/:intersection_id
 * Lookup camera by intersection ID (used by frontend CameraFeedPanel)
 * Returns null (404) if no camera is configured for this intersection
 */
/**
 * GET /api/cameras/by-slug/:slug
 * Lookup camera directly by intersection cuip_slug (one-shot join, no two-step lookup)
 * Returns 404 if no intersection or no camera for that slug
 */
router.get('/by-slug/:slug', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, i.name as intersection_name
       FROM cameras c
       JOIN intersections i ON i.intersection_id = c.intersection_id
       WHERE i.cuip_slug = $1
       ORDER BY c.id`,
      [req.params.slug]
    );
    if (!result.rows.length) {
      return res.status(404).json(null);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-intersection/:intersection_id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, i.name as intersection_name
       FROM cameras c
       LEFT JOIN intersections i ON i.intersection_id = c.intersection_id
       WHERE c.intersection_id = $1
       ORDER BY c.id`,
      [req.params.intersection_id]
    );
    if (!result.rows.length) {
      return res.status(404).json(null);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cameras/:id
 * Get single camera by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, i.name as intersection_name
       FROM cameras c
       LEFT JOIN intersections i ON i.intersection_id = c.intersection_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/cameras
 * Create new camera record for an intersection
 * Body: { intersection_id, label, ip_address, stream_path?, rtsp_path?, status?, notes? }
 * Note: Each intersection can have at most one camera
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { intersection_id, label, ip_address, stream_path, rtsp_path, status, notes } = req.body;

    if (!intersection_id || !label || !ip_address) {
      return res.status(400).json({ error: 'Missing required fields: intersection_id, label, ip_address' });
    }

    const result = await db.query(
      `INSERT INTO cameras (intersection_id, label, ip_address, stream_path, rtsp_path, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [intersection_id, label, ip_address, stream_path || '/axis-cgi/mjpg/video.cgi', rtsp_path || '/axis-media/media.amp', status || 'active', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505' && (err.detail || '').includes('cameras_ip_unique')) {
      return res.status(409).json({ error: 'A camera with that IP address already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/cameras/:id
 * Update camera record
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { label, ip_address, stream_path, rtsp_path, status, notes } = req.body;

    const result = await db.query(
      `UPDATE cameras
       SET label = COALESCE($1, label),
           ip_address = COALESCE($2, ip_address),
           stream_path = COALESCE($3, stream_path),
           rtsp_path = COALESCE($4, rtsp_path),
           status = COALESCE($5, status),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [label, ip_address, stream_path, rtsp_path, status, notes, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/cameras/:id
 * Delete camera record
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM cameras WHERE id = $1 RETURNING id', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Stream Proxy Endpoints
// ============================================================

/**
 * GET /api/cameras/:id/stream
 * MJPEG proxy with automatic Digest auth (two-step challenge/response)
 */
router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const cameraResult = await db.query('SELECT * FROM cameras WHERE id = $1', [req.params.id]);
    if (!cameraResult.rows.length) return res.status(404).json({ error: 'Camera not found' });
    if (!CAMERA_USERNAME || !CAMERA_PASSWORD) return res.status(502).json({ error: 'Camera credentials not configured' });

    const { ip_address, stream_path } = cameraResult.rows[0];
    const [hostname, portStr] = ip_address.split(':');
    const port = portStr ? parseInt(portStr, 10) : 80;

    console.log(`[camera-stream] connecting to http://${hostname}:${port}${stream_path}`);

    cameraGet(hostname, port, stream_path,
      (cameraRes, cameraReq) => {
        console.log(`[camera-stream] streaming content-type=${cameraRes.headers['content-type']}`);
        res.setHeader('Content-Type', cameraRes.headers['content-type'] || 'multipart/x-mixed-replace');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Connection', 'keep-alive');
        cameraRes.pipe(res);
        req.on('close', () => cameraReq.destroy());
      },
      (statusCode, message) => {
        console.error(`[camera-stream] failed: ${statusCode} ${message}`);
        if (!res.headersSent) res.status(502).json({ error: message });
      }
    );
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /api/cameras/:id/snapshot
 * Single JPEG frame with automatic Digest auth
 */
router.get('/:id/snapshot', authenticate, async (req, res) => {
  try {
    const cameraResult = await db.query('SELECT * FROM cameras WHERE id = $1', [req.params.id]);
    if (!cameraResult.rows.length) return res.status(404).json({ error: 'Camera not found' });
    if (!CAMERA_USERNAME || !CAMERA_PASSWORD) return res.status(502).json({ error: 'Camera credentials not configured' });

    const { ip_address } = cameraResult.rows[0];
    const [hostname, portStr] = ip_address.split(':');
    const port = portStr ? parseInt(portStr, 10) : 80;

    cameraGet(hostname, port, '/axis-cgi/jpg/image.cgi',
      (cameraRes, cameraReq) => {
        res.setHeader('Content-Type', cameraRes.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        cameraRes.pipe(res);
        req.on('close', () => cameraReq.destroy());
      },
      (statusCode, message) => {
        if (!res.headersSent) res.status(502).json({ error: message });
      }
    );
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
