const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { queryLogs } = require('../processor/models/logModel');

const app = express();
const PORT = process.env.QUERY_SERVICE_PORT || 3004;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// JWT verification middleware (simplified - you can enhance this)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For now, we'll skip JWT verification and just pass through
  // In production, you should verify the JWT token here
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // req.user = decoded;
  
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'logs-query-service' });
});

// Get logs with filters
app.get('/api/logs', verifyToken, async (req, res) => {
  try {
    const {
      userId,
      organizationId,
      level,
      appName,
      search,
      limit = 100,
      offset = 0
    } = req.query;

    if (!userId && !organizationId) {
      return res.status(400).json({ error: 'userId or organizationId required' });
    }

    const result = await queryLogs({
      userId,
      organizationId,
      level: level !== 'all' ? level : undefined,
      appName: appName !== 'all' ? appName : undefined,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get log statistics
app.get('/api/logs/stats', verifyToken, async (req, res) => {
  try {
    const { userId, organizationId } = req.query;

    if (!userId && !organizationId) {
      return res.status(400).json({ error: 'userId or organizationId required' });
    }

    // Get basic stats
    const allLogs = await queryLogs({
      userId,
      organizationId,
      limit: 10000 // Get recent logs for stats
    });

    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentLogs = allLogs.logs.filter(log => log.timestamp >= fiveMinutesAgo);
    const hourlyLogs = allLogs.logs.filter(log => log.timestamp >= oneHourAgo);

    res.json({
      totalLogs: allLogs.total,
      logsPerMinuteRecent: recentLogs.length / 5,
      logsPerMinute: hourlyLogs.length / 60,
      lastLogTimestamp: allLogs.logs[0]?.timestamp || 0,
      errorCount: allLogs.logs.filter(log => log.level === 'error').length,
      warningCount: allLogs.logs.filter(log => log.level === 'warning').length,
      infoCount: allLogs.logs.filter(log => log.level === 'info').length,
      debugCount: allLogs.logs.filter(log => log.level === 'debug').length
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Logs Query Service running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
