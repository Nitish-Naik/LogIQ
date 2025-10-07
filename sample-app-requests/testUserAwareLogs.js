// Test script to demonstrate sending logs with user context
import axios from 'axios';

const COLLECTOR_URL = 'http://localhost:4000/logs';

// Simulate different users
const users = [
  {
    userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    organizationId: 'org-acme-corp',
    name: 'John Doe'
  },
  {
    userId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    organizationId: 'org-acme-corp',
    name: 'Jane Smith'
  },
  {
    userId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    organizationId: 'org-techstart',
    name: 'Bob Johnson'
  }
];

const logMessages = [
  { level: 'info', message: 'User logged in successfully' },
  { level: 'info', message: 'Dashboard page loaded' },
  { level: 'warn', message: 'API response taking longer than expected' },
  { level: 'error', message: 'Failed to load user preferences' },
  { level: 'debug', message: 'Cache hit for user profile' },
  { level: 'info', message: 'Settings updated successfully' },
  { level: 'error', message: 'Payment processing failed' },
  { level: 'warn', message: 'Session about to expire' }
];

async function sendLogWithUserContext(user, logData) {
  try {
    const log = {
      timestamp: new Date().toISOString(),
      level: logData.level,
      message: logData.message,
      appName: 'user-aware-test-app',
      userId: user.userId,
      organizationId: user.organizationId,
      meta: {
        userName: user.name,
        sessionId: Math.random().toString(36).slice(2),
        environment: 'test'
      }
    };

    const response = await axios.post(COLLECTOR_URL, log);
    console.log(`✅ [${user.name}] ${logData.level.toUpperCase()}: ${logData.message}`);
    console.log(`   → userId: ${user.userId}`);
    console.log(`   → organizationId: ${user.organizationId}`);
    
  } catch (error) {
    console.error(`❌ Failed to send log:`, error.message);
  }
}

async function sendLogWithoutUserContext(logData) {
  try {
    const log = {
      timestamp: new Date().toISOString(),
      level: logData.level,
      message: logData.message,
      appName: 'anonymous-test-app',
      meta: {
        sessionId: Math.random().toString(36).slice(2),
        environment: 'test'
      }
    };

    const response = await axios.post(COLLECTOR_URL, log);
    console.log(`✅ [ANONYMOUS] ${logData.level.toUpperCase()}: ${logData.message}`);
    console.log(`   → No user context (will be stored as NULL)`);
    
  } catch (error) {
    console.error(`❌ Failed to send log:`, error.message);
  }
}

async function runTest() {
  console.log('\n🚀 Starting User-Aware Logging Test\n');
  console.log('═'.repeat(80));
  
  // Test 1: Send logs with user context
  console.log('\n📝 Test 1: Sending logs with user context\n');
  for (let i = 0; i < 5; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const logData = logMessages[Math.floor(Math.random() * logMessages.length)];
    await sendLogWithUserContext(user, logData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '═'.repeat(80));
  
  // Test 2: Send logs without user context
  console.log('\n📝 Test 2: Sending logs without user context (anonymous)\n');
  for (let i = 0; i < 3; i++) {
    const logData = logMessages[Math.floor(Math.random() * logMessages.length)];
    await sendLogWithoutUserContext(logData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Test completed!\n');
  console.log('📊 Next steps:');
  console.log('   1. Check processor logs to see logs being inserted');
  console.log('   2. Query logs by userId in your frontend dashboard');
  console.log('   3. Verify user_id and organization_id columns in PostgreSQL');
  console.log('\n💡 Query examples:');
  console.log(`   GET http://localhost:3004/api/logs?userId=${users[0].userId}`);
  console.log(`   GET http://localhost:3004/api/logs?organizationId=${users[0].organizationId}`);
  console.log('');
}

// Run the test
runTest().catch(console.error);
