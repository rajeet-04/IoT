import { verifyToken } from '../utils/jwt.js';

/**
 * Express middleware that requires a valid access token cookie.
 * Sets req.userId on success, returns 401 on failure.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Express middleware that optionally reads an access token.
 * Sets req.userId if token is valid, sets null if absent/invalid.
 * Does NOT block the request.
 */
export function optionalAuth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
  } catch {
    req.userId = null;
  }

  next();
}
