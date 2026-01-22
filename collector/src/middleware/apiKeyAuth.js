// src/middleware/apiKeyAuth.js

const pool = require('../config/postgresClient');
const crypto = require('crypto');

/**
 * Middleware to validate API key and extract user context
 * 
 * Checks:
 * 1. API key is present in header
 * 2. API key format is valid
 * 3. API key exists in database and is active
 * 4. Attaches userId and organizationId to req object
 */
async function validateApiKey(req, res, next) {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key is required. Please provide it in X-API-Key header or Authorization Bearer token.'
      });
    }

    // Validate API key format
    if (!isValidApiKeyFormat(apiKey)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key format. Expected format: idl_sk_...'
      });
    }

    // Hash the API key to compare with database
    const keyHash = hashApiKey(apiKey);

    // Look up API key in database
    const result = await pool.query(
      `SELECT 
        ak.id,
        ak.user_id,
        ak.organization_id,
        ak.is_active,
        ak.expires_at,
        u.email as user_email,
        o.name as organization_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      JOIN organizations o ON ak.organization_id = o.id
      WHERE ak.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key. Key not found.'
      });
    }

    const apiKeyData = result.rows[0];

    // Check if key is active
    if (!apiKeyData.is_active) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key has been revoked.'
      });
    }

    // Check if key has expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key has expired.'
      });
    }

    // Update last_used_at timestamp (fire and forget)
    pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [apiKeyData.id]
    ).catch(err => console.error('Failed to update last_used_at:', err));

    // Attach user context to request
    req.userContext = {
      userId: apiKeyData.user_id,
      organizationId: apiKeyData.organization_id,
      userEmail: apiKeyData.user_email,
      organizationName: apiKeyData.organization_name,
      apiKeyId: apiKeyData.id
    };

    console.log(`✅ API key validated for user: ${apiKeyData.user_email} (${apiKeyData.organization_name})`);
    
    next();
  } catch (error) {
    console.error('❌ API key validation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to validate API key.'
    });
  }
}

/**
 * Hashes an API key using SHA-256
 */
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Validates API key format
 */
function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Check format: idl_sk_ prefix + at least 20 characters
  const pattern = /^idl_sk_[A-Za-z0-9_-]{20,}$/;
  return pattern.test(apiKey);
}

module.exports = { validateApiKey };
