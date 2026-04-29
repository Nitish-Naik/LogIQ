const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { generateApiKey } = require('../utils/apiKeyGenerator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper function to generate JWT
const generateToken = (userId, email, organizationId) => {
  return jwt.sign(
    { userId, email, organizationId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Signup
exports.signup = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, organizationName } = req.body;

    // Start transaction
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create organization
    const organizationId = uuidv4();
    await client.query(
      'INSERT INTO organizations (id, name) VALUES ($1, $2)',
      [organizationId, organizationName]
    );

    // Create user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, email, password_hash, organization_id, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, email, passwordHash, organizationId, 'admin']
    );

    // Generate API key for the new user
    const { apiKey, keyHash, keyPrefix } = generateApiKey();
    await client.query(
      `INSERT INTO api_keys (user_id, organization_id, key_hash, key_prefix, name) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, keyHash, keyPrefix, 'Default API Key']
    );

    // Commit transaction
    await client.query('COMMIT');

    // Generate token
    const token = generateToken(userId, email, organizationId);

    res.status(201).json({
      message: 'User created successfully',
      token,
      accessToken: token,
      refreshToken: token, // In production, generate separate refresh token
      user: {
        userId: userId,
        id: userId,
        email,
        organizationId,
        organizationName,
        role: 'admin'
      },
      apiKey // Return the plain API key ONLY on signup
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    client.release();
  }
};

// Signin
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.organization_id, u.role, u.is_active, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.email, user.organization_id);

    res.json({
      message: 'Login successful',
      token,
      accessToken: token,
      refreshToken: token, // In production, generate separate refresh token
      user: {
        userId: user.id,
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
};

// Verify token (for protected routes)
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user details
    const result = await pool.query(
      `SELECT u.id, u.email, u.organization_id, u.role, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = result.rows[0];

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: 'Failed to verify token' });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset email will be sent' });
    }

    // TODO: Implement password reset token generation and email sending
    // For now, just return success
    res.json({ message: 'If an account exists, a reset email will be sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // TODO: Implement token verification and password reset
    // For now, return not implemented
    res.status(501).json({ error: 'Password reset not yet implemented' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    // TODO: Implement token verification
    // For now, return not implemented
    res.status(501).json({ error: 'Token verification not yet implemented' });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
};

// Get current user (me endpoint)
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user details
    const result = await pool.query(
      `SELECT u.id, u.email, u.organization_id, u.role, u.is_active, u.created_at, u.last_login, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: 'Failed to get user data' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the old token (even if expired, we can still decode it)
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // If token is expired, we can still decode it to get user info
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Fetch user to ensure they still exist and are active
    const result = await pool.query(
      `SELECT u.id, u.email, u.organization_id, u.role, u.is_active, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate new token
    const newToken = generateToken(user.id, user.email, user.organization_id);

    res.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Create API key for current user
exports.createApiKey = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const organizationId = decoded.organizationId;

    const { name = 'New API Key', description = null, expiresAt = null } = req.body || {};

    // Generate API key
    const { apiKey, keyHash, keyPrefix } = generateApiKey();

    // Insert into DB
    const insert = await pool.query(
      `INSERT INTO api_keys (user_id, organization_id, key_hash, key_prefix, name, description, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, key_prefix, name, is_active, created_at, expires_at`,
      [userId, organizationId, keyHash, keyPrefix, name, description, expiresAt]
    );

    const row = insert.rows[0];

    // Return the plain API key once
    res.status(201).json({
      id: row.id,
      name: row.name,
      keyPrefix: row.key_prefix,
      isActive: row.is_active,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      apiKey // plain text shown only once
    });

  } catch (error) {
    console.error('Create API key error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

// List API keys for current user
exports.listApiKeys = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      `SELECT id, key_prefix, name, description, is_active, last_used_at, created_at, expires_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ keys: result.rows });

  } catch (error) {
    console.error('List API keys error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to list API keys' });
  }
};

// Revoke (deactivate) an API key
exports.revokeApiKey = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const keyId = req.params.id;

    const result = await pool.query(
      `UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id, is_active`,
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ id: result.rows[0].id, isActive: result.rows[0].is_active });

  } catch (error) {
    console.error('Revoke API key error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};
