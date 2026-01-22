import axios from 'axios';
import { getRandomLogLevel, getRandomMessage } from './utils.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Send log using API KEY authentication
 * 
 * @param {string} appName - Name of the application
 * @param {string} apiKey - API key from signup (format: idl_sk_...)
 * @param {boolean} simulateError - Simulate network errors
 * @param {boolean} malformed - Send malformed log
 */
export async function sendLogWithApiKey(appName, apiKey, simulateError = false, malformed = false) {
  const level = getRandomLogLevel();
  const message = getRandomMessage(level);

  let log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    appName,
    meta: {
      sessionId: Math.random().toString(36).slice(2),
      env: 'production',
      version: '1.0.0'
    }
  };

  // NO userId or organizationId needed!
  // They will be automatically extracted from the API key

  if (malformed) {
    // Drop required fields to test validation
    delete log.level;
  }

  try {
    if (simulateError && Math.random() < 0.1) {
      throw new Error("Simulated network failure");
    }

    const res = await axios.post(process.env.COLLECTOR_URL || 'http://localhost:4000/logs', log, {
      headers: {
        'X-API-Key': apiKey,  // ✅ Pass API key in header
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ [${appName}] Sent: ${level} - ${message}`);
    console.log(`   User: ${res.data.userId}, Org: ${res.data.organizationId}`);
  } catch (err) {
    if (err.response) {
      console.error(`❌ [${appName}] Failed:`, err.response.status, err.response.data);
    } else {
      console.error(`❌ [${appName}] Failed to send log:`, err.message);
    }
  }
}

/**
 * LEGACY: Send log with userId and organizationId (old method)
 * This still works but is NOT recommended
 */
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
