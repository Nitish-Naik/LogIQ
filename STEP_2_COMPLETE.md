# ✅ Step 2 Complete: Generate API Keys on Signup

## What We Just Built

We successfully integrated **API key generation** into the user signup process! Now when a user creates an account, they automatically receive an API key that their applications can use to send logs.

---

## 🔧 Files Created/Modified

### 1. **auth-service/src/utils/apiKeyGenerator.js** (NEW)
**Purpose**: Utility functions for creating and managing API keys

**Key Functions**:
```javascript
// Generate a new API key with secure random bytes
generateApiKey() 
  → returns { apiKey, keyHash, keyPrefix }
  → apiKey: "idl_sk_<32_random_chars>" (shown to user ONCE)
  → keyHash: SHA-256 hash for storage
  → keyPrefix: First 12 chars for display in dashboard

// Hash an API key for lookup/verification
hashApiKey(apiKey)
  → returns SHA-256 hash string

// Validate API key format
isValidApiKeyFormat(apiKey)
  → returns true/false
```

**Security Features**:
- Uses `crypto.randomBytes(24)` for cryptographically secure randomness
- Base64url encoding (URL-safe characters)
- SHA-256 hashing (same as passwords - never store plain keys)
- Format prefix `idl_sk_` identifies Instant Dev Logs secret keys

---

### 2. **auth-service/src/controllers/authController.js** (MODIFIED)
**Changes Made**:

**Import Added**:
```javascript
const { generateApiKey } = require('../utils/apiKeyGenerator');
```

**In `signup()` function** (after user creation, before commit):
```javascript
// Generate API key for the user
const { apiKey, keyHash, keyPrefix } = generateApiKey();
await client.query(
  `INSERT INTO api_keys (key_hash, key_prefix, user_id, organization_id, name, is_active, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
  [keyHash, keyPrefix, userId, organizationId, 'Default API Key', true]
);
```

**In response JSON**:
```javascript
res.status(201).json({
  message: 'User registered successfully',
  user: { userId, email, organizationId, organizationName, role },
  accessToken,
  refreshToken,
  apiKey  // ⚠️ This is shown ONLY ONCE!
});
```

---

## 🎓 What You Learned

### 1. **Cryptographic Key Generation**
- Used `crypto.randomBytes()` instead of `Math.random()` for security
- Converted bytes to base64url encoding (URL-safe characters)
- Created keys with 144+ bits of entropy (very strong)

### 2. **One-Way Hashing**
- Just like passwords, API keys are NEVER stored in plain text
- SHA-256 hash is one-way (can't reverse it to get original key)
- To validate a key: hash it and compare with stored hash

### 3. **Prefix Pattern**
- Format: `idl_sk_<random>`
- Benefits:
  - Easy to identify in logs/code reviews
  - Industry standard (Stripe: `sk_`, GitHub: `ghp_`, AWS: `AKIA`)
  - Helps prevent accidental exposure
  - Future-proof (can add more key types: `idl_pk_` for public keys)

### 4. **Key Metadata**
- `key_prefix`: First 12 chars for display ("idl_sk_AbC123...***")
- `name`: User-friendly label ("Default API Key", "Production Server", etc.)
- `is_active`: Soft delete (revoke without losing history)
- `last_used_at`: Audit trail (when was this key last used?)

### 5. **Transaction Safety**
- API key creation happens INSIDE the database transaction
- If any step fails (org creation, user creation, key creation), everything rolls back
- Ensures data consistency (no orphaned records)

---

## 🧪 How to Test

### 1. **Start Auth Service**
```bash
cd auth-service
npm start
```

### 2. **Test Signup with Postman/curl**
```bash
curl -X POST http://localhost:3003/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "organizationName": "Test Org"
  }'
```

### 3. **Expected Response**
```json
{
  "message": "User registered successfully",
  "user": {
    "userId": "uuid-here",
    "email": "test@example.com",
    "organizationId": "org-uuid-here",
    "organizationName": "Test Org",
    "role": "admin"
  },
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "apiKey": "idl_sk_AbC123XyZ789qWeRtY012345678901"  ← NEW!
}
```

### 4. **Verify in Database**
```bash
# Connect to PostgreSQL
docker exec -it instant_dev_logs-postgres-1 psql -U admin -d instant_dev_logs

# Check the API key record
SELECT id, key_prefix, name, is_active, user_id, organization_id, created_at 
FROM api_keys;
```

**Expected Result**:
```
id | key_prefix        | name              | is_active | user_id      | organization_id | created_at
---+-------------------+-------------------+-----------+--------------+-----------------+------------
1  | idl_sk_AbC12...   | Default API Key   | t         | uuid-123...  | org-uuid-456... | 2025-...
```

---

## 🔐 Security Best Practices We Followed

✅ **Never log API keys** - Don't console.log() them in production  
✅ **Show key only once** - User sees it in signup response, never again  
✅ **Hash before storage** - Database only stores SHA-256 hash  
✅ **Prefix for identification** - Easy to spot in code reviews  
✅ **Soft delete (is_active)** - Can revoke without data loss  
✅ **Transaction safety** - All-or-nothing key creation  

---

## 📋 Step 2 Checklist

- [x] Create `apiKeyGenerator.js` utility
- [x] Add `generateApiKey()` function with crypto
- [x] Add `hashApiKey()` function for verification
- [x] Add `isValidApiKeyFormat()` function
- [x] Import utility in `authController.js`
- [x] Generate API key in `signup()` function
- [x] Store hashed key in `api_keys` table
- [x] Return plain key in signup response
- [x] Test for syntax errors ✅ No errors!

---

## 🎯 Next: Step 3 - Validate API Keys in Collector

Now that users get an API key when they sign up, we need to:

1. **Create middleware** to validate API keys on incoming log requests
2. **Extract** the API key from request headers
3. **Hash and lookup** the key in the database
4. **Attach** `userId` and `organizationId` to the request
5. **Update** the `last_used_at` timestamp

This way, when an external application sends logs with:
```javascript
headers: { 'X-API-Key': 'idl_sk_...' }
```

Our collector will:
- ✅ Validate the key
- ✅ Identify the user/organization
- ✅ Enrich logs automatically

---

## 💡 Real-World Analogy

Think of the API key like a **hotel room keycard**:

1. **Check-in (Signup)**: Hotel creates a keycard for you
2. **One-time view**: You see the card number once (but usually just swipe it)
3. **Stored securely**: Hotel stores an encrypted version
4. **Every door (Collector)**: Keycard validates your identity
5. **Audit trail**: Hotel knows when you used the keycard
6. **Revoke anytime**: Lost your card? Hotel deactivates it instantly

That's exactly what we just built! 🎉

---

**Ready for Step 3?** Let me know and we'll build the API key validation middleware!
