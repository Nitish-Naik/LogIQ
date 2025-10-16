// src/validators/logSchema.js

const Joi = require('joi');

// Define schema for incoming logs
const logSchema = Joi.object({
  timestamp: Joi.date().iso().required(),
  level: Joi.string().valid('info', 'warn', 'error', 'debug').required(),
  message: Joi.string().required(),
  appName: Joi.string().required(),
  userId: Joi.string().uuid().optional(), // User ID for log association
  organizationId: Joi.string().uuid().optional(), // Organization ID for multi-tenant support
  meta: Joi.object().optional(), // additional info like IP, etc.
});

module.exports = logSchema;
