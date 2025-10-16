# Logs API Usage Guide

This guide shows how to use the logs API endpoints in your frontend application.

## Available APIs

### 1. Get Total Logs Count

Fetches the total number of logs stored in the database.

**Backend Endpoint:** `GET /logs/count`

**Frontend Method:**
```typescript
import { apiService } from '@/lib/apiService';

async function getTotalLogs() {
  const result = await apiService.getLogsCount();
  console.log('Total logs:', result.total);
  console.log('Timestamp:', result.timestamp);
  
  return result;
  // Returns: { total: 1234, timestamp: "2025-10-17T..." }
}
```

### 2. Get All Logs (with Pagination)

Fetches all logs with optional pagination and ordering.

**Backend Endpoint:** `GET /logs/all`

**Frontend Method:**
```typescript
import { apiService } from '@/lib/apiService';

async function getAllLogs() {
  const result = await apiService.getAllLogs({
    limit: 100,        // Number of logs per page (default: 1000)
    offset: 0,         // Skip first N logs (default: 0)
    orderBy: 'timestamp DESC'  // Sort order (default: timestamp DESC)
  });
  
  console.log('Logs:', result.logs);
  console.log('Count:', result.count);
  console.log('Limit:', result.limit);
  console.log('Offset:', result.offset);
  
  return result;
  // Returns: { logs: [...], count: 100, limit: 100, offset: 0 }
}
```

### 3. Get Filtered Logs

Fetches logs filtered by user, level, application, and search term.

**Backend Endpoint:** `GET /logs`

**Frontend Method:**
```typescript
import { apiService } from '@/lib/apiService';

async function getFilteredLogs(userId: string) {
  const result = await apiService.getLogs({
    userId: userId,              // Required: User ID
    level: 'error',              // Optional: Log level (error, warn, info, debug)
    appName: 'payment-service',  // Optional: Application name
    search: 'payment failed',    // Optional: Search in message
    limit: 50,                   // Optional: Number of results (default: 20)
    offset: 0                    // Optional: Skip N results (default: 0)
  });
  
  console.log('Filtered logs:', result.logs);
  
  return result;
  // Returns: { logs: [...], total: 50, hasMore: true }
}
```

### 4. Create New Log

Sends a new log entry to the collector service.

**Backend Endpoint:** `POST /logs` (Collector service)

**Frontend Method:**
```typescript
import { apiService } from '@/lib/apiService';

async function createLog(userId: string, organizationId: string) {
  const result = await apiService.createLog({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'User action completed successfully',
    appName: 'dashboard',
    userId: userId,
    organizationId: organizationId,
    meta: {
      action: 'button_click',
      component: 'dashboard'
    }
  });
  
  return result;
  // Returns: { status: 'success' }
}
```

## React Component Examples

### Example 1: Total Logs Counter

```tsx
import { useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';

export function LogsCounter() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchTotal() {
      const result = await apiService.getLogsCount();
      setTotal(result.total);
    }
    
    fetchTotal();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotal, 30000);
    return () => clearInterval(interval);
  }, []);

  return <div>Total Logs: {total.toLocaleString()}</div>;
}
```

### Example 2: Paginated Logs Table

```tsx
import { useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';

export function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    async function fetchLogs() {
      const result = await apiService.getAllLogs({
        limit: pageSize,
        offset: page * pageSize,
        orderBy: 'timestamp DESC'
      });
      setLogs(result.logs);
    }
    
    fetchLogs();
  }, [page]);

  return (
    <div>
      <table>
        {/* Render logs */}
      </table>
      <button onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</button>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  );
}
```

### Example 3: Filtered Logs with Search

```tsx
import { useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';

export function FilteredLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.userId) return;

    async function fetchLogs() {
      const result = await apiService.getLogs({
        userId: user.userId,
        level: level || undefined,
        search: search || undefined,
        limit: 100
      });
      setLogs(result.logs);
    }
    
    fetchLogs();
  }, [user?.userId, level, search]);

  return (
    <div>
      <select value={level} onChange={(e) => setLevel(e.target.value)}>
        <option value="">All Levels</option>
        <option value="error">Error</option>
        <option value="warn">Warning</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>
      
      <input
        type="text"
        placeholder="Search logs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div>
        {logs.map(log => (
          <div key={log._id}>{log.message}</div>
        ))}
      </div>
    </div>
  );
}
```

## API Response Types

### LogsCountResponse
```typescript
{
  total: number;        // Total number of logs
  timestamp: string;    // ISO 8601 timestamp
}
```

### GetAllLogsResponse
```typescript
{
  logs: LogEntry[];     // Array of log entries
  count: number;        // Number of logs returned
  limit: number;        // Limit used
  offset: number;       // Offset used
}
```

### GetLogsResponse
```typescript
{
  logs: LogEntry[];     // Array of log entries
  total: number;        // Total matching logs
  hasMore: boolean;     // Whether more logs exist
}
```

### LogEntry
```typescript
{
  _id: string;
  _creationTime: number;
  level: string;                     // 'error' | 'warn' | 'info' | 'debug'
  message: string;
  timestamp: number;
  app_name: string;
  metadata: Record<string, unknown>;
  userId: string;
}
```

## Error Handling

All API methods throw errors on failure. Use try-catch blocks:

```typescript
try {
  const result = await apiService.getLogsCount();
  console.log('Total:', result.total);
} catch (error) {
  console.error('Failed to fetch logs count:', error);
  // Handle error (show notification, etc.)
}
```

## Usage in Components

The `TotalLogsCard` component is ready to use:

```tsx
import TotalLogsCard from '@/components/dashboard/TotalLogsCard';

export function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TotalLogsCard />
      {/* Other cards */}
    </div>
  );
}
```

## Testing

You can test the API in the browser console:

```javascript
// Get total logs
const total = await apiService.getLogsCount();
console.log(total);

// Get all logs
const allLogs = await apiService.getAllLogs({ limit: 10 });
console.log(allLogs);

// Get filtered logs (replace with your userId)
const filtered = await apiService.getLogs({
  userId: 'your-user-id',
  level: 'error'
});
console.log(filtered);
```

## Backend Services Required

Make sure these services are running:

1. **Query Service** (Port 3004):
   ```powershell
   cd query-service
   npm start
   ```

2. **Collector Service** (Port 4000):
   ```powershell
   cd collector
   npm start
   ```

3. **PostgreSQL Database**:
   ```powershell
   docker-compose up -d
   ```

## Next Steps

- Use `TotalLogsCard` in your dashboard
- Implement pagination with `getAllLogs()`
- Create custom filters with `getLogs()`
- Track user actions with `createLog()`
