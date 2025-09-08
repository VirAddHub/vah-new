const crypto = require("crypto");

/**
 * Generate a cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hexadecimal token string
 */
function newToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { newToken };
