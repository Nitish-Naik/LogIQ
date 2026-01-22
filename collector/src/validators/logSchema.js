// src/validators/logSchema.js

const Joi = require('joi');

// Define schema for incoming logs
// Note: userId and organizationId are optional in the request body
// They will be injected by the API key middleware
const logSchema = Joi.object({
  timestamp: Joi.date().iso().required(),
  level: Joi.string().valid('info', 'warn', 'error', 'debug').required(),
  message: Joi.string().required(),
  appName: Joi.string().required(),
  userId: Joi.string().uuid().optional(), // Optional - will be set by API key middleware if not provided
  organizationId: Joi.string().uuid().optional(), // Optional - will be set by API key middleware if not provided
  meta: Joi.object().optional(), // additional info like IP, etc.
});

module.exports = logSchema;
