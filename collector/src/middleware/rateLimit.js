const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Simple fixed-window rate limiter per API key
// Defaults: 120 requests per minute
const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MIN || '120', 10);
const WINDOW_SECONDS = 60;

async function rateLimit(req, res, next) {
  try {
    const apiKeyId = req.userContext?.apiKeyId;
    if (!apiKeyId) return res.status(401).json({ error: 'Missing API key context' });

    const key = `rl:${apiKeyId}`;
    const limit = DEFAULT_LIMIT;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (current > limit) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: ttl });
    }

    next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    // Fail open: allow request if rate limiter fails
    next();
  }
}

module.exports = rateLimit;
