import axios from 'axios';
import { getRandomLogLevel, getRandomMessage } from './utils.js';
import dotenv from 'dotenv';
dotenv.config();

export async function sendLog(appName, simulateError = false, malformed = false, userId = null, organizationId = null) {
  const level = getRandomLogLevel();
  const message = getRandomMessage(level);

  let log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    appName,
    meta: {
      userId: Math.floor(Math.random() * 1000),
      sessionId: Math.random().toString(36).slice(2),
      env: 'dev'
    }
  };

  // Add userId and organizationId if provided (for authenticated logs)
  if (userId) {
    log.userId = userId;
  }
  if (organizationId) {
    log.organizationId = organizationId;
  }

  if (malformed) {
    // Drop fields
    delete log.meta;
  }

  try {
    if (simulateError && Math.random() < 0.1) {
      throw new Error("Simulated network failure");
    }

    const res = await axios.post(process.env.COLLECTOR_URL, log);
    console.log(`✅ [${appName}] Sent: ${level} - ${message}`);
  } catch (err) {
    console.error(`❌ [${appName}] Failed to send log:`, err.message);
  }
}
