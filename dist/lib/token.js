const crypto = require("crypto");

/**
 * Generate a cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hexadecimal token string
 */
function newToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate SHA256 hash of a string
 * @param {string} s - String to hash
 * @returns {string} Hexadecimal hash string
 */
function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

module.exports = { newToken, sha256Hex };
