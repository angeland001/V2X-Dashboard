const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Express middleware: verify Bearer JWT from Authorization header or ?token query param.
 * Attaches decoded payload to req.user on success.
 * Returns 401 on missing/invalid/expired tokens.
 *
 * Accepts token from either:
 * - Authorization: Bearer <token>  (standard)
 * - ?token=<token>                 (needed for <img src> stream URLs)
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: msg });
  }
}

module.exports = authenticate;
