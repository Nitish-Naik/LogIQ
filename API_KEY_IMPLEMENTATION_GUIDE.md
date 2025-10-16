# API Key System - Step-by-Step Implementation Guide

## 🎯 What We're Building

An API key authentication system so users' external applications can send logs without knowing `userId` or `organizationId`.

**Current Problem:**
```
User signs up → Gets userId & orgId
But their deployed app doesn't know these IDs!
Can't send logs with proper context ❌
```

**Solution:**
```
User signs up → Gets API_KEY (linked to userId & orgId)
User adds API_KEY to their app's .env
App sends logs with API_KEY
Platform validates API_KEY → enriches logs with userId & orgId ✅
```

---

## 📋 Implementation Steps

### ✅ Step 1: Database Schema (COMPLETED)

**File Created:** `db/api_keys_schema.sql`

**What it does:**
- Creates `api_keys` table to store API keys
- Stores hash (not plain key) for security
- Links each key to a `user_id` and `organization_id`
- Tracks usage (`last_used_at`) and status (`is_active`)

**Run this command to create the table:**
```powershell
Get-Content ".\db\api_keys_schema.sql" | docker exec -i devlogs-postgres psql -U devlogs -d logsdb
```

**Verify it worked:**
```powershell
docker exec -it devlogs-postgres psql -U devlogs -d logsdb -c "\d api_keys"
```

---

### 🔧 Step 2: Generate API Key on Signup

**Goal:** When a user signs up, automatically create an API key for them.

**Files to modify:**
1. `auth-service/src/controllers/authController.js` - Add key generation
2. `auth-service/src/utils/apiKeyGenerator.js` - NEW: Helper functions

**What we'll add:**
- Function to generate secure API keys (format: `idl_sk_<random32chars>`)
- Function to hash keys with SHA-256
- Auto-create API key when user signs up
- Return API key in signup response (shown only once!)

**Key format:**
```
idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT
├─┬─┴─ ────────────────┬──────────────────
│ │                    │
│ │                    └─ Random 32 characters (base64url)
│ │
│ └─ "sk" = Secret Key
│
└─ "idl" = Instant Dev Logs prefix
```

---

### 🛡️ Step 3: API Key Validation Middleware

**Goal:** Create middleware that validates API keys in incoming requests.

**Files to create:**
1. `collector/src/middleware/apiKeyAuth.js` - NEW: Validation logic

**What it does:**
```javascript
1. Extract API key from request header: X-API-Key
2. Hash the provided key
3. Look up hash in database
4. If found and active:
   - Attach userId and organizationId to req object
   - Update last_used_at
   - Call next()
5. If not found or inactive:
   - Return 401 Unauthorized
```

**Flow:**
```
Request comes in with header: X-API-Key: idl_sk_abc123...
   ↓
Middleware hashes it: SHA-256(idl_sk_abc123...)
   ↓
Look up in database: SELECT user_id, organization_id WHERE key_hash = ...
   ↓
Found and active?
   ├─ YES → Attach to req: req.userId, req.organizationId
   └─ NO → Return 401 error
```

---

### 🔄 Step 4: Update Collector to Use API Key

**Goal:** Modify collector to accept API keys instead of userId/orgId in request body.

**Files to modify:**
1. `collector/src/routes/logRoutes.js` - Use new middleware
2. `collector/src/controllers/logControllers.js` - Read from req.userId instead of body

**Before (broken):**
```javascript
// User's app must somehow know userId and orgId
POST /logs
Body: {
  message: "Error occurred",
  level: "error",
  appName: "payment-service",
  userId: "660e8400-...",  ← App doesn't know this!
  organizationId: "550e8400-..."  ← App doesn't know this!
}
```

**After (working):**
```javascript
// User's app only needs API key
POST /logs
Headers:
  X-API-Key: idl_sk_abc123xyz...
Body: {
  message: "Error occurred",
  level: "error",
  appName: "payment-service"
  // No userId or organizationId needed!
}

// Collector middleware auto-adds:
// req.userId = "660e8400-..."
// req.organizationId = "550e8400-..."
```

---

### 🎨 Step 5: Show API Key in Frontend After Signup

**Goal:** Display the API key to the user immediately after signup (only chance to see it!).

**Files to modify:**
1. `dashboard/src/pages/Signup.tsx` - Show API key in success message
2. `dashboard/src/lib/apiService.ts` - Update response type

**What user sees:**
```
┌─────────────────────────────────────────────────────┐
│  ✅ Account Created Successfully!                   │
│                                                     │
│  ⚠️ IMPORTANT: Save Your API Key                   │
│  This will only be shown once!                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT   │  │
│  │                                     [Copy]  │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Add this to your application's .env:              │
│  LOG_API_KEY=idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6...   │
│                                                     │
│  [Continue to Dashboard]                           │
└─────────────────────────────────────────────────────┘
```

---

### 🔐 Step 6: API Key Management Page

**Goal:** Let users view, create, and revoke API keys.

**Files to create:**
1. `dashboard/src/pages/ApiKeys.tsx` - NEW: API key management UI
2. `auth-service/src/controllers/apiKeyController.js` - NEW: CRUD endpoints
3. `auth-service/src/routes/apiKeyRoutes.js` - NEW: API routes

**Features:**
```
API Keys Management Page

┌───────────────────────────────────────────────────────┐
│  [+ Create New API Key]                               │
│                                                       │
│  Your API Keys:                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Name            │ Key            │ Created │ Actions│
│  ├─────────────────────────────────────────────────┤ │
│  │ Production Key  │ idl_sk_abc1... │ Oct 15  │ [Revoke]│
│  │ Development Key │ idl_sk_xyz9... │ Oct 17  │ [Revoke]│
│  │ Testing Key     │ idl_sk_def5... │ Oct 17  │ [Revoke]│
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**API Endpoints:**
- `POST /api/auth/api-keys` - Create new key
- `GET /api/auth/api-keys` - List user's keys
- `DELETE /api/auth/api-keys/:id` - Revoke key
- `PUT /api/auth/api-keys/:id` - Update key name/description

---

### 📦 Step 7: Client SDK for Users

**Goal:** Create a simple NPM package users can install in their apps.

**Files to create:**
1. `sdk/javascript/index.js` - JavaScript SDK
2. `sdk/javascript/package.json` - NPM package config
3. `sdk/javascript/README.md` - Usage instructions

**Usage (what users will do):**

```bash
# In their application
npm install @instant-dev-logs/logger
```

```javascript
// In their app code
const { Logger } = require('@instant-dev-logs/logger');

const logger = new Logger({
  apiKey: process.env.LOG_API_KEY,
  appName: 'my-payment-service',
  collectorUrl: 'http://localhost:4000/logs'
});

// Now they can just log!
logger.info('Server started on port 3000');
logger.error('Payment processing failed', { orderId: '12345' });
logger.warn('High memory usage detected');
```

**SDK handles:**
- Adding API key to headers
- Formatting log messages
- Error handling
- Retry logic
- Batching (optional)

---

## 🎓 Learning Points

### Security Best Practices
1. **Never store plain API keys** - Always hash with SHA-256
2. **Show key only once** - After creation, never retrieve plain key
3. **Support revocation** - Users can disable compromised keys
4. **Track usage** - Update `last_used_at` to detect unused keys
5. **Optional expiration** - Keys can have expiry dates

### Database Design
- Use UUIDs for keys (not auto-increment integers)
- Add indexes on frequently queried columns
- Use foreign keys with CASCADE delete
- Store metadata (name, description) for user reference

### API Design
- Use standard HTTP headers (`X-API-Key`)
- Return proper status codes (401 for auth failures)
- Enrich data server-side (don't trust client)
- Keep client API simple (hide complexity)

---

## 📊 Implementation Order

**Today (Step by Step with You):**
1. ✅ Create database table
2. ✅ Add key generation to signup
3. ✅ Test signup with Postman/curl
4. ✅ Create validation middleware
5. ✅ Update collector routes
6. ✅ Test end-to-end flow

**Next Session:**
7. ✅ Frontend display
8. ✅ API key management page
9. ✅ Client SDK
10. ✅ Documentation

---

## 🚦 Ready to Start?

Let's begin with **Step 2: Generating API Keys on Signup**.

I'll create the helper functions and update the auth controller.

**Are you ready to proceed? Say "yes" and I'll continue!** 🚀
