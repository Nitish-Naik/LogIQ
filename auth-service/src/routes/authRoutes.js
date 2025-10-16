const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  signup,
  signin,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  verifyResetToken,
  resetPassword
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/refresh-token', refreshToken);

// Password reset routes (public)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
