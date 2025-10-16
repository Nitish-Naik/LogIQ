const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const pool = require('../config/db');
const { generateApiKey } = require('../utils/apiKeyGenerator');
const { 
  signupSchema, 
  signinSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  verifyResetTokenSchema 
} = require('../validators/authSchema');

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

    // Generate API key for the user
    const { apiKey, keyHash, keyPrefix } = generateApiKey();
    await client.query(
      `INSERT INTO api_keys (key_hash, key_prefix, user_id, organization_id, name, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [keyHash, keyPrefix, userId, organizationId, 'Default API Key', true]
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
      refreshToken,
      apiKey  // ⚠️ IMPORTANT: This is shown ONLY ONCE! User must save it.
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

// Forgot password - Request password reset
const forgotPassword = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Validate request body
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email } = value;

    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link will be sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store hashed token in database
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, hashedToken, expiresAt]
    );

    // In production, send email with reset link
    // For now, we'll log it (you can integrate SendGrid, Nodemailer, etc.)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
    
    console.log('━'.repeat(80));
    console.log('📧 PASSWORD RESET EMAIL');
    console.log('━'.repeat(80));
    console.log(`To: ${user.email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Token: ${resetToken}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log('━'.repeat(80));

    // TODO: Integrate email service
    // await sendPasswordResetEmail(user.email, resetLink);

    res.status(200).json({ 
      message: 'If an account exists with this email, a password reset link will be sent.',
      // Remove this in production - only for development/testing
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  } finally {
    client.release();
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = verifyResetTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token } = value;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is valid
    const result = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.is_used, u.email
       FROM password_reset_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1`,
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = result.rows[0];

    // Check if token is already used
    if (tokenData.is_used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    res.status(200).json({ 
      valid: true,
      email: tokenData.email,
      message: 'Token is valid' 
    });

  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Validate request body
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, newPassword } = value;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await client.query('BEGIN');

    // Check if token exists and is valid
    const tokenResult = await client.query(
      `SELECT id, user_id, expires_at, is_used
       FROM password_reset_tokens
       WHERE token = $1`,
      [hashedToken]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = tokenResult.rows[0];

    // Check if token is already used
    if (tokenData.is_used) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, tokenData.user_id]
    );

    // Mark token as used
    await client.query(
      'UPDATE password_reset_tokens SET is_used = TRUE, used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    await client.query('COMMIT');

    res.status(200).json({ 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    client.release();
  }
};

module.exports = {
  signup,
  signin,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
