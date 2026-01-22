import { sendLogWithApiKey } from './logSenderWithApiKey.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Example: How to use API key authentication
 * 
 * Steps:
 * 1. User signs up on the platform → Gets API key (e.g., idl_sk_abc123...)
 * 2. User copies the API key
 * 3. User adds it to their application's environment variables
 * 4. Application uses the API key to send logs
 */

// Get API key from environment variable
// In production, this would be in your .env file:
// LOG_API_KEY=idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT
const API_KEY = process.env.LOG_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: LOG_API_KEY not found in environment variables');
  console.log('Please set your API key:');
  console.log('  1. Sign up at http://localhost:5173/signup');
  console.log('  2. Copy your API key');
  console.log('  3. Add to .env file: LOG_API_KEY=idl_sk_...');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting API key authenticated log sender...');
  console.log(`📝 Using API key: ${API_KEY.substring(0, 15)}...`);
  console.log('');

  // Send logs every 2 seconds
  setInterval(async () => {
    await sendLogWithApiKey('my-awesome-app', API_KEY);
  }, 2000);
}

main();
