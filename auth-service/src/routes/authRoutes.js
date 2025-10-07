const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  signup,
  signin,
  refreshToken,
  getCurrentUser
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
