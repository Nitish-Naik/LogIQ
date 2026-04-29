const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  signupSchema, 
  signinSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  verifyResetTokenSchema 
} = require('../validators/authSchema');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }
    
    next();
  };
};

// Auth routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/signin', validate(signinSchema), authController.signin);
router.post('/verify', authController.verifyToken);
router.get('/me', authController.getCurrentUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-reset-token', validate(verifyResetTokenSchema), authController.verifyResetToken);

// API key management
// Create a new API key (returns the plain key once)
router.post('/keys', authController.createApiKey);
// List API keys for current user
router.get('/keys', authController.listApiKeys);
// Revoke API key by id
router.delete('/keys/:id', authController.revokeApiKey);

module.exports = router;
