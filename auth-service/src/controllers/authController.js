const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { signupSchema, signinSchema } = require('../validators/authSchema');

// Generate JWT tokens
const generateTokens = (userId, organizationId) => {
  const accessToken = jwt.sign(
    { userId, organizationId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, organizationId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// Signup controller
const signup = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Validate request body
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, organizationName } = value;

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Create organization
    const organizationId = uuidv4();
    await client.query(
      'INSERT INTO organizations (id, name, created_at) VALUES ($1, $2, NOW())',
      [organizationId, organizationName]
    );

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, email, password_hash, organization_id, role, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, email.toLowerCase(), hashedPassword, organizationId, 'admin']
    );

    // Commit transaction
    await client.query('COMMIT');

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId, organizationId);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId,
        email: email.toLowerCase(),
        organizationId,
        organizationName,
        role: 'admin'
      },
      accessToken,
      refreshToken
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to register user. Please try again.' });
  } finally {
    client.release();
  }
};

// Signin controller
const signin = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = signinSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Get user with organization details
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.organization_id, u.role, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.organization_id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        userId: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
};

// Refresh token controller
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        decoded.userId,
        decoded.organizationId
      );

      res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken
      });
    });

  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.organization_id, u.role, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.status(200).json({
      user: {
        userId: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

module.exports = {
  signup,
  signin,
  refreshToken,
  getCurrentUser
};
