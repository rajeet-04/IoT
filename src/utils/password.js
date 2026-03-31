import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt.
 * @param {string} plainText - Password to hash
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a bcrypt hash.
 * @param {string} plainText - Password to verify
 * @param {string} hash - Bcrypt hash to compare against
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}
