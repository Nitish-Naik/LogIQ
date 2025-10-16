# User-Aware Logging Architecture

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER AUTHENTICATION                                │
│                                                                             │
│  User Signs Up/In → Auth Service (3003) → PostgreSQL (auth_schema)        │
│                         ↓                                                   │
│                   Returns JWT with:                                         │
│                   - userId                                                  │
│                   - organizationId                                          │
│                   - accessToken                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOG CREATION FLOW                                  │
│                                                                             │
│  Frontend/Backend App                                                       │
│  ├── Has user context (userId, organizationId)                            │
│  └── Creates log event                                                      │
│                                                                             │
│      {                                                                      │
│        "timestamp": "2025-10-08T10:00:00Z",                               │
│        "level": "info",                                                     │
│        "message": "User action performed",                                  │
│        "appName": "my-app",                                                │
│        "userId": "user-123",           ← From authenticated user          │
│        "organizationId": "org-456",    ← From authenticated user          │
│        "meta": { ... }                                                      │
│      }                                                                      │
│                                                                             │
│                     POST http://localhost:4000/logs                         │
│                                    ↓                                        │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                       COLLECTOR SERVICE (Port 4000)                         │
│                                                                             │
│  Step 1: Validate incoming log                                             │
│  ├── logSchema.js validates:                                               │
│  │   ├── timestamp (required)                                              │
│  │   ├── level (required)                                                  │
│  │   ├── message (required)                                                │
│  │   ├── appName (required)                                                │
│  │   ├── userId (optional UUID) ✅                                         │
│  │   ├── organizationId (optional UUID) ✅                                 │
│  │   └── meta (optional object)                                            │
│  │                                                                          │
│  Step 2: Flatten log to key-value pairs                                    │
│  └── {                                                                      │
│        timestamp: "2025-10-08T10:00:00Z",                                  │
│        level: "info",                                                       │
│        message: "User action performed",                                    │
│        appName: "my-app",                                                   │
│        userId: "user-123",           ← Preserved                          │
│        organizationId: "org-456",    ← Preserved                          │
│        meta: "{...}"                                                        │
│      }                                                                      │
│                                                                             │
│  Step 3: Push to Redis Stream                                              │
│  └── XADD logs-stream * [key1 val1 key2 val2 ...]                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                        REDIS STREAM (Message Queue)                         │
│                                                                             │
│  Stream: logs-stream                                                        │
│  ├── Entry ID: 1234567890-0                                                │
│  └── Fields:                                                                │
│      ├── timestamp: "2025-10-08T10:00:00Z"                                │
│      ├── level: "info"                                                      │
│      ├── message: "User action performed"                                   │
│      ├── appName: "my-app"                                                  │
│      ├── userId: "user-123"           ← Stored in stream                  │
│      ├── organizationId: "org-456"    ← Stored in stream                  │
│      └── meta: "{...}"                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROCESSOR SERVICE (Reads Stream)                      │
│                                                                             │
│  Step 1: Read from Redis Stream                                            │
│  ├── XREAD BLOCK 5000 COUNT 10 STREAMS logs-stream [lastId]              │
│  └── Gets all fields including userId and organizationId                   │
│                                                                             │
│  Step 2: Parse log entries                                                 │
│  └── logObj = {                                                             │
│        timestamp: "2025-10-08T10:00:00Z",                                  │
│        level: "info",                                                       │
│        message: "User action performed",                                    │
│        appName: "my-app",                                                   │
│        userId: "user-123",           ← Extracted from stream              │
│        organizationId: "org-456",    ← Extracted from stream              │
│        meta: {...}                                                          │
│      }                                                                      │
│                                                                             │
│  Step 3: Insert into PostgreSQL                                            │
│  └── insertLogs(logs) calls:                                               │
│      INSERT INTO logs (                                                     │
│        timestamp, level, message, app_name, meta,                          │
│        user_id,              ← log.userId                                  │
│        organization_id       ← log.organizationId                          │
│      ) VALUES ($1, $2, $3, $4, $5, $6, $7)                                │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE (logsdb)                           │
│                                                                             │
│  Table: logs                                                                │
│  ┌─────┬───────────┬───────┬─────────┬─────────┬──────┬─────────┬─────────┐│
│  │ id  │timestamp  │ level │message  │app_name │ meta │ user_id │  org_id ││
│  ├─────┼───────────┼───────┼─────────┼─────────┼──────┼─────────┼─────────┤│
│  │ 1   │2025-10-08 │ info  │ User... │ my-app  │{...} │user-123 │org-456  ││
│  │ 2   │2025-10-08 │ error │ API...  │ my-app  │{...} │user-123 │org-456  ││
│  │ 3   │2025-10-08 │ warn  │ Slow... │ other   │{...} │user-789 │org-456  ││
│  │ 4   │2025-10-08 │ debug │ Cache...│ my-app  │{...} │ NULL    │ NULL    ││
│  └─────┴───────────┴───────┴─────────┴─────────┴──────┴─────────┴─────────┘│
│                                                                             │
│  Indexes:                                                                   │
│  ├── idx_logs_user_id (user_id)                                           │
│  ├── idx_logs_organization_id (organization_id)                           │
│  ├── idx_logs_timestamp (timestamp)                                        │
│  └── idx_logs_level (level)                                                │
│                                                                             │
│  Foreign Keys:                                                              │
│  ├── user_id → users(id)                                                   │
│  └── organization_id → organizations(id)                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUERY SERVICE (Port 3004)                              │
│                                                                             │
│  GET /api/logs?userId=user-123                                             │
│                                                                             │
│  Step 1: Verify JWT token                                                  │
│  ├── Extract userId from token                                             │
│  └── Ensure user can only query their own logs                            │
│                                                                             │
│  Step 2: Build filtered query                                              │
│  └── SELECT * FROM logs                                                     │
│      WHERE user_id = 'user-123'       ← Filter by user                    │
│      AND level = 'error'              ← Optional filter                    │
│      AND app_name = 'my-app'          ← Optional filter                    │
│      ORDER BY timestamp DESC                                                │
│      LIMIT 100 OFFSET 0                                                     │
│                                                                             │
│  Step 3: Return filtered logs                                              │
│  └── {                                                                      │
│        logs: [ ... ],                                                       │
│        total: 42,                                                           │
│        hasMore: false                                                       │
│      }                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND DASHBOARD                                 │
│                                                                             │
│  User sees only their logs:                                                │
│  ├── Charts filtered by userId                                             │
│  ├── Tables filtered by userId                                             │
│  └── Live stream filtered by userId                                        │
│                                                                             │
│  Organization admins can see:                                               │
│  └── All logs for organizationId (multi-user visibility)                   │
└─────────────────────────────────────────────────────────────────────────────┘


## Key Points

1. **userId and organizationId flow through the entire pipeline**
   - Sent from app → Collector → Redis → Processor → PostgreSQL

2. **Validation happens at Collector**
   - Optional UUID fields
   - Won't reject logs without user context

3. **Storage in PostgreSQL**
   - Dedicated columns: user_id, organization_id
   - Indexed for fast queries
   - Foreign keys to users/organizations tables

4. **Filtering at Query Service**
   - JWT authentication required
   - Users can only see their own logs (userId filter)
   - Org admins can see all org logs (organizationId filter)

5. **Backward Compatible**
   - Logs without userId/organizationId still work (stored as NULL)
   - Useful for system-level logs or unauthenticated services
