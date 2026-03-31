import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived access token (15 minutes).
 * @param {string} userId - The user's MongoDB ObjectId string
 * @returns {string} Signed JWT access token
 */
export function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generate a long-lived refresh token (7 days).
 * @param {string} userId - The user's MongoDB ObjectId string
 * @returns {string} Signed JWT refresh token
 */
export function generateRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - JWT token string to verify
 * @param {string} [secret] - Secret to verify with (defaults to JWT_SECRET)
 * @returns {object} Decoded payload
 * @throws {jwt.TokenExpiredError|jwt.JsonWebTokenError} If token is invalid or expired
 */
export function verifyToken(token, secret = process.env.JWT_SECRET) {
  return jwt.verify(token, secret);
}

/**
 * Decode a JWT without verification (for debugging only).
 * @param {string} token - JWT token string to decode
 * @returns {object|null} Decoded payload or null
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
