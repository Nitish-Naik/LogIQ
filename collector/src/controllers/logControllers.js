// src/controllers/logController.js

const logSchema = require('../validators/logSchema');
const redis = require('../config/redisClient');

const STREAM_KEY = process.env.REDIS_STREAM_KEY;


const logHandler = async (req, res) => {
  // Inject userId and organizationId from API key authentication
  // These are set by the validateApiKey middleware
  if (req.userContext) {
    req.body.userId = req.body.userId || req.userContext.userId;
    req.body.organizationId = req.body.organizationId || req.userContext.organizationId;
  }

  const { error, value } = logSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: 'Invalid log format', details: error.details });
  }

  try {
    // Convert to flat key-value pairs (Redis streams format)
    const flatLog = {};
    Object.entries(value).forEach(([key, val]) => {
        flatLog[key] = typeof val ==='object' ? JSON.stringify(val) : String(val);
    });

    await redis.xadd(STREAM_KEY, '*', ...Object.entries(flatLog).flat());
    console.log(`📤 Log pushed to Redis Stream [User: ${value.userId}, Org: ${value.organizationId}]`);

    console.log("Flatlog : ", flatLog);
    
    return res.status(200).json({ 
      status: 'Log received',
      userId: value.userId,
      organizationId: value.organizationId
    });
  } catch (err) {
    console.error('❌ Redis push error:', err);
    return res.status(500).json({ error: "Failed to queue log" });
  }
};

module.exports = { logHandler };
