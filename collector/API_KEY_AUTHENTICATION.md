# 🔐 API Key Authentication Guide

## Overview

The collector service now supports **API Key authentication**. This allows applications to send logs without needing to know their `userId` or `organizationId`.

## How It Works

### 1. User Journey
```
1. User signs up → Gets API key (idl_sk_...)
2. User copies API key (shown ONCE during signup)
3. User adds API key to their application
4. Application sends logs with API key
```

### 2. Technical Flow
```
Application                Collector              PostgreSQL
    |                          |                       |
    |-- POST /logs ----------->|                       |
    |   X-API-Key: idl_sk_...  |                       |
    |                          |                       |
    |                          |-- Lookup API key ---->|
    |                          |<-- userId, orgId -----|
    |                          |                       |
    |                          |-- Store log --------->|
    |<-- 200 OK ---------------|   (with user context) |
```

## API Reference

### Endpoint
```
POST http://localhost:4000/logs
```

### Headers
```
X-API-Key: idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT
Content-Type: application/json
```

**Alternative:** You can also use `Authorization: Bearer idl_sk_...`

### Request Body
```json
{
  "timestamp": "2025-10-17T12:00:00.000Z",
  "level": "info",
  "message": "User logged in successfully",
  "appName": "my-app",
  "meta": {
    "userId": 123,
    "sessionId": "abc123",
    "ip": "192.168.1.1"
  }
}
```

**Note:** `userId` and `organizationId` are **NOT required** in the request body. They are automatically extracted from the API key.

### Response
```json
{
  "status": "Log received",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Error Responses

### 401 Unauthorized - Missing API Key
```json
{
  "error": "Unauthorized",
  "message": "API key is required. Please provide it in X-API-Key header or Authorization Bearer token."
}
```

### 401 Unauthorized - Invalid Format
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key format. Expected format: idl_sk_..."
}
```

### 401 Unauthorized - Key Not Found
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key. Key not found."
}
```

### 401 Unauthorized - Key Revoked
```json
{
  "error": "Unauthorized",
  "message": "API key has been revoked."
}
```

### 401 Unauthorized - Key Expired
```json
{
  "error": "Unauthorized",
  "message": "API key has expired."
}
```

## Usage Examples

### JavaScript (Node.js)
```javascript
const axios = require('axios');

const API_KEY = process.env.LOG_API_KEY; // idl_sk_...

async function sendLog(level, message) {
  try {
    const response = await axios.post('http://localhost:4000/logs', {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      appName: 'my-app',
      meta: {
        version: '1.0.0',
        env: 'production'
      }
    }, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Log sent:', response.data);
  } catch (error) {
    console.error('Failed to send log:', error.response?.data || error.message);
  }
}

sendLog('info', 'Application started');
```

### cURL
```bash
curl -X POST http://localhost:4000/logs \
  -H "X-API-Key: idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-10-17T12:00:00.000Z",
    "level": "info",
    "message": "Test log message",
    "appName": "test-app",
    "meta": {}
  }'
```

### Python
```python
import requests
import os
from datetime import datetime

API_KEY = os.getenv('LOG_API_KEY')

def send_log(level, message):
    response = requests.post(
        'http://localhost:4000/logs',
        json={
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'message': message,
            'appName': 'my-python-app',
            'meta': {}
        },
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    )
    print(f'Status: {response.status_code}')
    print(f'Response: {response.json()}')

send_log('info', 'Python app started')
```

## Security Best Practices

### ✅ DO:
- Store API keys in environment variables (`.env` files)
- Use different API keys for different environments (dev, staging, prod)
- Rotate API keys periodically
- Revoke compromised keys immediately
- Use HTTPS in production

### ❌ DON'T:
- Hardcode API keys in your source code
- Commit API keys to version control (Git)
- Share API keys in plain text (Slack, email, etc.)
- Use the same API key across multiple unrelated applications
- Log API keys in your application logs

## Testing

### 1. Install dependencies
```bash
cd collector
npm install
```

### 2. Start the collector service
```bash
npm run dev
```

### 3. Test with sample script
```bash
cd ../sample-app-requests
export LOG_API_KEY="idl_sk_your_api_key_here"
node testApiKeyAuth.js
```

## Migration Guide

### Old Method (Deprecated)
```javascript
// ❌ Old way - requires userId and organizationId
await axios.post('http://localhost:4000/logs', {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Hello',
  appName: 'my-app',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  organizationId: '550e8400-e29b-41d4-a716-446655440000'
});
```

### New Method (Recommended)
```javascript
// ✅ New way - uses API key
await axios.post('http://localhost:4000/logs', {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Hello',
  appName: 'my-app'
  // No userId or organizationId needed!
}, {
  headers: {
    'X-API-Key': process.env.LOG_API_KEY
  }
});
```

## Troubleshooting

### "API key is required"
- Make sure you're sending the `X-API-Key` header
- Check that the header value is not empty

### "Invalid API key format"
- API keys must start with `idl_sk_`
- Check for extra spaces or newlines in the key
- Ensure you copied the full key during signup

### "Invalid API key. Key not found"
- The API key doesn't exist in the database
- You may have copied it incorrectly
- Generate a new API key from the dashboard

### "API key has been revoked"
- The key was disabled by an admin
- Generate a new API key from the dashboard

### Database connection errors
- Ensure PostgreSQL is running: `docker ps`
- Check collector `.env` file has correct DB credentials
- Test connection: `docker exec -it devlogs-postgres psql -U devlogs -d logsdb`

## Architecture

```
┌─────────────────┐
│   Application   │
│  (Any Language) │
└────────┬────────┘
         │ HTTP POST + API Key
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│    Collector    │────→│  PostgreSQL  │
│  (Port 4000)    │     │ (API Keys)   │
└────────┬────────┘     └──────────────┘
         │
         │ Validated Log + User Context
         ▼
┌─────────────────┐
│  Redis Streams  │
│  (Queue Logs)   │
└─────────────────┘
```

## Database Schema

The API key middleware queries the `api_keys` table:

```sql
SELECT 
  ak.id,
  ak.user_id,
  ak.organization_id,
  ak.is_active,
  ak.expires_at,
  u.email as user_email,
  o.name as organization_name
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
JOIN organizations o ON ak.organization_id = o.id
WHERE ak.key_hash = SHA256(provided_api_key)
```
