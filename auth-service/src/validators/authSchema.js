const Joi = require('joi');

const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  }),
  organizationName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Organization name must be at least 2 characters',
    'string.max': 'Organization name must not exceed 100 characters',
    'any.required': 'Organization name is required'
  })
});

const signinSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'New password is required'
  })
});

const verifyResetTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  })
});

module.exports = {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetTokenSchema
};
