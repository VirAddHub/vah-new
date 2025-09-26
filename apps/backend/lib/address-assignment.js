/**
 * Address Assignment Helper
 * Use this in your signup/payment success handlers
 */

const fetch = global.fetch || require('node-fetch');

/**
 * Assign address to user after successful signup/payment
 * @param {number} userId - The user ID
 * @param {number} locationId - The location ID (default: 1)
 * @param {string} apiBaseUrl - Your API base URL
 * @returns {Promise<Object>} Assignment result
 */
async function assignAddressToUser(userId, locationId = 1, apiBaseUrl = process.env.API_BASE_URL) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/me/address/assign`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // TODO: Replace with your real auth header (JWT, session, etc.)
        'x-user-id': String(userId),
      },
      body: JSON.stringify({ locationId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Address assignment failed: ${result.message || 'Unknown error'}`);
    }

    return {
      success: true,
      address: result.address,
      alreadyAssigned: result.already || false,
    };
  } catch (error) {
    console.error('[address-assignment] Failed to assign address:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get user's current address
 * @param {number} userId - The user ID
 * @param {string} apiBaseUrl - Your API base URL
 * @returns {Promise<Object>} Address result
 */
async function getUserAddress(userId, apiBaseUrl = process.env.API_BASE_URL) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/me/address`, {
      headers: {
        // TODO: Replace with your real auth header
        'x-user-id': String(userId),
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, address: null, hasAddress: false };
      }
      throw new Error(`Address retrieval failed: ${result.message || 'Unknown error'}`);
    }

    return {
      success: true,
      address: result.address,
      hasAddress: true,
    };
  } catch (error) {
    console.error('[address-assignment] Failed to get address:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  assignAddressToUser,
  getUserAddress,
};
