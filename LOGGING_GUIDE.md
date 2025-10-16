# Logging Guide: Sending Logs with User Context

## Flow Overview

```
Frontend/App → Collector (4000) → Redis Stream → Processor → PostgreSQL → Query Service (3004) → Frontend
```

## 1. From Frontend (React/TypeScript)

### Example: Sending a log with user context

```typescript
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';

function YourComponent() {
  const { user } = useAuth();

  const handleAction = async () => {
    try {
      // Your business logic here
      
      // Send log with user context
      await apiService.createLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User performed action X',
        appName: 'my-react-app',
        userId: user.userId,              // From authenticated user
        organizationId: user.organizationId, // From authenticated user
        meta: {
          action: 'button_click',
          page: window.location.pathname,
          userAgent: navigator.userAgent
        }
      });
    } catch (error) {
      console.error('Failed to send log:', error);
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Example: Creating a logger utility

```typescript
// src/utils/logger.ts
import { apiService } from '@/lib/apiService';

interface LogContext {
  userId?: string;
  organizationId?: string;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = context;
  }

  async log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>) {
    try {
      await apiService.createLog({
        timestamp: new Date().toISOString(),
        level,
        message,
        appName: 'my-react-app',
        userId: this.context.userId,
        organizationId: this.context.organizationId,
        meta
      });
    } catch (error) {
      // Fail silently to not disrupt user experience
      console.error('Logging failed:', error);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    return this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    return this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    return this.log('error', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    return this.log('debug', message, meta);
  }
}

export const logger = new Logger();
```

### Usage in your app:

```typescript
// In your AuthContext or App.tsx
import { logger } from '@/utils/logger';

useEffect(() => {
  if (user) {
    // Set user context when user logs in
    logger.setContext({
      userId: user.userId,
      organizationId: user.organizationId
    });
  }
}, [user]);

// Then anywhere in your app:
logger.info('User viewed dashboard');
logger.error('Payment failed', { orderId: '12345', amount: 99.99 });
logger.warn('API response slow', { endpoint: '/api/users', duration: 3000 });
```

## 2. From Backend Node.js/Express

### Example: Sending logs from your backend service

```javascript
const axios = require('axios');

class Logger {
  constructor(appName, userId = null, organizationId = null) {
    this.appName = appName;
    this.userId = userId;
    this.organizationId = organizationId;
    this.collectorUrl = process.env.COLLECTOR_URL || 'http://localhost:4000/logs';
  }

  async sendLog(level, message, meta = {}) {
    try {
      const log = {
        timestamp: new Date().toISOString(),
        level,
        message,
        appName: this.appName,
        meta
      };

      // Add user context if available
      if (this.userId) log.userId = this.userId;
      if (this.organizationId) log.organizationId = this.organizationId;

      await axios.post(this.collectorUrl, log);
    } catch (error) {
      console.error('Failed to send log:', error.message);
    }
  }

  info(message, meta) { return this.sendLog('info', message, meta); }
  warn(message, meta) { return this.sendLog('warn', message, meta); }
  error(message, meta) { return this.sendLog('error', message, meta); }
  debug(message, meta) { return this.sendLog('debug', message, meta); }
}

// Usage in Express middleware
app.use((req, res, next) => {
  // Extract user from JWT token or session
  const userId = req.user?.userId;
  const organizationId = req.user?.organizationId;
  
  // Attach logger to request
  req.logger = new Logger('my-backend-api', userId, organizationId);
  next();
});

// Usage in route handlers
app.post('/api/orders', async (req, res) => {
  try {
    // Your business logic
    const order = await createOrder(req.body);
    
    // Log with user context
    await req.logger.info('Order created', {
      orderId: order.id,
      amount: order.total
    });
    
    res.json(order);
  } catch (error) {
    await req.logger.error('Order creation failed', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = Logger;
```

## 3. Sample App Example (for testing)

```javascript
// sample-app-requests/apps/authenticatedApp.js
import { sendLog } from '../logSender.js';

async function runAuthenticatedApp() {
  // Simulate authenticated user
  const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const organizationId = 'org-1234-5678-90ab-cdef';

  console.log('🔐 Running authenticated app with user context');

  setInterval(async () => {
    await sendLog('authenticated-app', false, false, userId, organizationId);
  }, 3000);
}

runAuthenticatedApp();
```

## 4. Data Flow Through the System

### Step 1: Log sent to Collector
```json
POST http://localhost:4000/logs
{
  "timestamp": "2025-10-08T10:30:00.000Z",
  "level": "info",
  "message": "User logged in",
  "appName": "my-app",
  "userId": "user-123",
  "organizationId": "org-456",
  "meta": {
    "ip": "192.168.1.1",
    "browser": "Chrome"
  }
}
```

### Step 2: Collector validates and pushes to Redis Stream
```javascript
// Validation (already done in logSchema.js)
{
  timestamp: ✅ required ISO date
  level: ✅ required (info|warn|error|debug)
  message: ✅ required string
  appName: ✅ required string
  userId: ✅ optional UUID
  organizationId: ✅ optional UUID
  meta: ✅ optional object
}

// Pushed to Redis Stream as flat key-value pairs
XADD logs-stream * 
  timestamp "2025-10-08T10:30:00.000Z"
  level "info"
  message "User logged in"
  appName "my-app"
  userId "user-123"
  organizationId "org-456"
  meta "{\"ip\":\"192.168.1.1\",\"browser\":\"Chrome\"}"
```

### Step 3: Processor reads from Redis and inserts to PostgreSQL
```sql
INSERT INTO logs (
  timestamp, 
  level, 
  message, 
  app_name, 
  meta, 
  user_id,           -- 👈 Stored here
  organization_id    -- 👈 Stored here
) VALUES (
  '2025-10-08T10:30:00.000Z',
  'info',
  'User logged in',
  'my-app',
  '{"ip":"192.168.1.1","browser":"Chrome"}',
  'user-123',        -- 👈 From log.userId
  'org-456'          -- 👈 From log.organizationId
);
```

### Step 4: Query Service filters by user/organization
```javascript
GET http://localhost:3004/api/logs?userId=user-123
// Returns only logs for this user

GET http://localhost:3004/api/logs?organizationId=org-456
// Returns all logs for this organization
```

## 5. Database Schema

```sql
-- Check if migration has been applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'logs' 
  AND column_name IN ('user_id', 'organization_id');

-- If columns don't exist, run migration:
-- Get-Content ".\db\update_logs_schema.sql" | docker exec -i devlogs-postgres psql -U devlogs -d logsdb
```

## 6. Testing the Complete Flow

### Start all services:
```powershell
# Terminal 1: Collector
cd collector
npm run dev

# Terminal 2: Processor
cd processor
node index.js

# Terminal 3: Query Service
cd query-service
node index.js

# Terminal 4: Auth Service
cd auth-service
npm run dev

# Terminal 5: Frontend
cd log-stream-buddy
npm run dev
```

### Send a test log:
```powershell
# Test without user context
curl -X POST http://localhost:4000/logs -H "Content-Type: application/json" -d '{\"timestamp\":\"2025-10-08T10:00:00Z\",\"level\":\"info\",\"message\":\"Test log\",\"appName\":\"test-app\"}'

# Test with user context
curl -X POST http://localhost:4000/logs -H "Content-Type: application/json" -d '{\"timestamp\":\"2025-10-08T10:00:00Z\",\"level\":\"info\",\"message\":\"Test log with user\",\"appName\":\"test-app\",\"userId\":\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\",\"organizationId\":\"org-1234-5678\"}'
```

### Query logs:
```powershell
# Get logs for specific user (requires JWT token)
curl -X GET "http://localhost:3004/api/logs?userId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 7. Important Notes

1. **userId and organizationId are optional** - logs without them will have NULL values in the database
2. **Frontend must be authenticated** - get userId and organizationId from AuthContext
3. **Backend services can log on behalf of users** - pass userId/organizationId when available
4. **Query Service filters by user/org** - ensures users only see their own logs
5. **Database migration required** - run `update_logs_schema.sql` to add the columns

## 8. Troubleshooting

### Logs not appearing in database?
- Check processor is running: `cd processor && node index.js`
- Check Redis connection: `docker exec -it devlogs-redis redis-cli PING`
- Check Redis stream: `docker exec -it devlogs-redis redis-cli XLEN logs-stream`

### userId/organizationId showing as NULL?
- Verify they're being sent in the POST request
- Check collector logs: should show userId/organizationId in flatlog
- Verify database columns exist: Run the migration SQL script

### Can't query logs by userId?
- Ensure JWT token is valid and included in Authorization header
- Check query service logs for errors
- Verify user exists in auth database
