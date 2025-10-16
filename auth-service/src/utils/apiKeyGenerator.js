const crypto = require('crypto');

/**
 * Generates a secure API key
 * Format: idl_sk_<32 random characters>
 * 
 * @returns {Object} { apiKey, keyHash, keyPrefix }
 * 
 * Example output:
 * {
 *   apiKey: "idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT",
 *   keyHash: "a1b2c3d4e5f6...",  // SHA-256 hash
 *   keyPrefix: "idl_sk_xY3nP..." // First 12 chars for display
 * }
 */
function generateApiKey() {
  // Generate 24 random bytes (will become ~32 chars in base64url)
  const randomBytes = crypto.randomBytes(24);
  
  // Convert to base64url (URL-safe, no padding)
  const randomPart = randomBytes.toString('base64url');
  
  // Create API key with prefix
  // Prefix format: idl_sk_ where:
  // - idl = Instant Dev Logs
  // - sk = Secret Key
  const apiKey = `idl_sk_${randomPart}`;
  
  // Hash the key for storage (NEVER store plain key in database!)
  const keyHash = hashApiKey(apiKey);
  
  // Create prefix for display (first 12 characters + "...")
  const keyPrefix = apiKey.substring(0, 12) + '...';
  
  return {
    apiKey,      // Plain key (show to user ONCE)
    keyHash,     // Hashed key (store in database)
    keyPrefix    // Display key (show in UI)
  };
}

/**
 * Hashes an API key using SHA-256
 * This is what we store in the database
 * 
 * @param {string} apiKey - Plain API key
 * @returns {string} SHA-256 hash (hex encoded)
 */
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Validates API key format
 * Checks if key matches expected pattern: idl_sk_<random>
 * 
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
function isValidApiKeyFormat(apiKey) {
  // Check if key exists and is a string
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Check format: idl_sk_ prefix + at least 20 characters
  const pattern = /^idl_sk_[A-Za-z0-9_-]{20,}$/;
  return pattern.test(apiKey);
}

module.exports = {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat
};
