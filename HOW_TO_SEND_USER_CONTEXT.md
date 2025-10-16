# Summary: Sending userId and organizationId to Redis → PostgreSQL

## Quick Answer

The system is **already configured** to handle `userId` and `organizationId` through the entire pipeline! Here's how it flows:

```
App → Collector → Redis Stream → Processor → PostgreSQL
  ↓         ↓           ↓            ↓          ↓
userId   validates   stores     extracts   stores in
orgId    & accepts   as k-v     & reads    user_id &
                     pairs                 org_id cols
```

## What's Already Done ✅

1. **Collector Validator** (`collector/src/validators/logSchema.js`)
   - Accepts optional `userId` (UUID)
   - Accepts optional `organizationId` (UUID)

2. **Collector Controller** (`collector/src/controllers/logControllers.js`)
   - Automatically flattens ALL fields (including userId/orgId) to Redis format
   - No changes needed - it already handles any fields you send

3. **Processor** (`processor/services/streamProcessor.js`)
   - Reads ALL fields from Redis Stream
   - Passes everything to `insertLogs()`

4. **Database Model** (`processor/models/logModel.js`)
   - `insertLogs()` accepts `userId` and `organizationId`
   - Stores them in `user_id` and `organization_id` columns
   - `queryLogs()` filters by userId or organizationId

## How to Send Logs with User Context

### From Your Frontend (React/TypeScript):

```typescript
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();

  const handleAction = async () => {
    // Send log with user context
    await apiService.createLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'User performed action',
      appName: 'my-react-app',
      userId: user.userId,              // ← Add this
      organizationId: user.organizationId, // ← Add this
      meta: { action: 'button_click' }
    });
  };
}
```

### From Backend (Node.js):

```javascript
const axios = require('axios');

async function logWithUser(userId, organizationId, level, message) {
  await axios.post('http://localhost:4000/logs', {
    timestamp: new Date().toISOString(),
    level,
    message,
    appName: 'my-backend',
    userId,              // ← Add this
    organizationId,      // ← Add this
    meta: {}
  });
}
```

### Direct cURL Test:

```bash
curl -X POST http://localhost:4000/logs \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-10-08T10:00:00Z",
    "level": "info",
    "message": "Test log with user",
    "appName": "test-app",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "organizationId": "org-1234"
  }'
```

## The Complete Flow in Detail

### 1. **POST to Collector** (Port 4000)
```json
{
  "timestamp": "2025-10-08T10:00:00Z",
  "level": "info",
  "message": "User logged in",
  "appName": "my-app",
  "userId": "user-123",           ← Your user ID
  "organizationId": "org-456",    ← Your org ID
  "meta": { "ip": "192.168.1.1" }
}
```

### 2. **Collector Validates & Pushes to Redis**
```javascript
// After validation, flattened to Redis format:
{
  timestamp: "2025-10-08T10:00:00Z",
  level: "info",
  message: "User logged in",
  appName: "my-app",
  userId: "user-123",        ← Preserved
  organizationId: "org-456", ← Preserved
  meta: "{\"ip\":\"192.168.1.1\"}"
}

// Pushed as: XADD logs-stream * timestamp "..." level "..." userId "user-123" ...
```

### 3. **Processor Reads from Redis**
```javascript
// streamProcessor.js reads:
const logObj = {
  timestamp: "2025-10-08T10:00:00Z",
  level: "info",
  message: "User logged in",
  appName: "my-app",
  userId: "user-123",        ← Extracted
  organizationId: "org-456", ← Extracted
  meta: {...}
};

// Calls: insertLogs([logObj])
```

### 4. **Inserted into PostgreSQL**
```sql
INSERT INTO logs (
  timestamp, level, message, app_name, meta, 
  user_id,           ← logObj.userId
  organization_id    ← logObj.organizationId
) VALUES (
  '2025-10-08T10:00:00Z',
  'info',
  'User logged in',
  'my-app',
  '{"ip":"192.168.1.1"}',
  'user-123',        ← Stored here
  'org-456'          ← Stored here
);
```

### 5. **Query by User**
```javascript
// GET /api/logs?userId=user-123
// Returns only logs where user_id = 'user-123'
```

## What You Need to Do

### Step 1: Run Database Migration (if not done)
```powershell
Get-Content ".\db\update_logs_schema.sql" | docker exec -i devlogs-postgres psql -U devlogs -d logsdb
```

This adds:
- `user_id` column (UUID, nullable)
- `organization_id` column (UUID, nullable)
- Indexes for fast querying
- Foreign keys to users/organizations tables

### Step 2: Update Your Apps to Send userId/organizationId

**Frontend Example:**
```typescript
// When user is authenticated, include their context
const { user } = useAuth();

await apiService.createLog({
  // ... other fields
  userId: user.userId,
  organizationId: user.organizationId
});
```

**Backend Example:**
```javascript
// In Express middleware
app.use((req, res, next) => {
  req.userId = req.user?.userId;        // From JWT/session
  req.orgId = req.user?.organizationId; // From JWT/session
  next();
});

// In your code
await sendLog({
  // ... other fields
  userId: req.userId,
  organizationId: req.orgId
});
```

### Step 3: Test It
```powershell
# Terminal 1: Start sample app that sends user context
cd sample-app-requests
node testUserAwareLogs.js

# Check processor logs to see userId/organizationId being inserted
# Check PostgreSQL to verify data
```

## Testing & Verification

### 1. Check if columns exist:
```sql
docker exec -it devlogs-postgres psql -U devlogs -d logsdb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'logs' AND column_name IN ('user_id', 'organization_id');"
```

### 2. Send test log:
```powershell
cd sample-app-requests
node testUserAwareLogs.js
```

### 3. Verify in database:
```sql
docker exec -it devlogs-postgres psql -U devlogs -d logsdb -c "SELECT id, level, message, user_id, organization_id FROM logs ORDER BY created_at DESC LIMIT 5;"
```

### 4. Query by user (needs JWT token):
```powershell
# Get access token from login first, then:
curl -X GET "http://localhost:3004/api/logs?userId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" -H "Authorization: Bearer YOUR_TOKEN"
```

## Important Notes

1. **Optional Fields**: `userId` and `organizationId` are optional - logs without them work fine (stored as NULL)

2. **No Code Changes Needed**: The pipeline already handles these fields automatically

3. **Backward Compatible**: Old logs without user context continue to work

4. **Security**: Query service uses JWT to ensure users only see their own logs

5. **Multi-Tenant**: Organization-level filtering allows admins to see all org logs

## Files Modified/Created

1. ✅ `collector/src/validators/logSchema.js` - Added userId, organizationId validation
2. ✅ `collector/src/server.js` - Added CORS support
3. ✅ `processor/models/logModel.js` - Already handles userId/organizationId
4. ✅ `db/update_logs_schema.sql` - Database migration (needs to be run)
5. ✅ `log-stream-buddy/src/lib/apiService.ts` - Added createLog() method
6. ✅ `sample-app-requests/logSender.js` - Updated to accept userId/organizationId
7. ✅ `sample-app-requests/testUserAwareLogs.js` - Test script created

## Ready to Use!

The system is ready to accept and store `userId` and `organizationId`. Just include them in your log payloads and they'll automatically flow through the entire pipeline! 🚀
