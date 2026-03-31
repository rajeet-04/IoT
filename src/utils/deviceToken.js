import crypto from 'node:crypto';

/**
 * Generate a unique device token as a UUID v4 string.
 * This token is given to the user once at device registration
 * to flash into the ESP32 firmware.
 * @returns {string} UUID v4 string (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 */
export function generateDeviceToken() {
  return crypto.randomUUID();
}
