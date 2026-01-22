// src/routes/logRoutes.js

const express = require('express');
const { logHandler } = require('../controllers/logControllers');
const { validateApiKey } = require('../middleware/apiKeyAuth');

const router = express.Router();

// POST /logs (mounted at /logs, so this becomes /)
// Protected by API key authentication
router.post('/', validateApiKey, logHandler);

module.exports = router;
