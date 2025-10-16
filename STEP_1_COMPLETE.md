# Step 1 Completed ✅ - Database Schema Created

## What We Just Did

Created the `api_keys` table in PostgreSQL to store API keys.

**File:** `db/api_keys_schema.sql`

## Table Structure

```
api_keys
├── id (UUID) - Primary key
├── key_hash (VARCHAR) - SHA-256 hash of API key (never store plain key!)
├── key_prefix (VARCHAR) - First 12 chars for display (e.g., "idl_sk_abc123...")
├── user_id (UUID) - Foreign key → users table
├── organization_id (UUID) - Foreign key → organizations table
├── name (VARCHAR) - User-friendly name (e.g., "Production Key")
├── description (TEXT) - Optional description
├── is_active (BOOLEAN) - Can be disabled/revoked
├── last_used_at (TIMESTAMP) - Track usage
├── created_at (TIMESTAMP) - When key was created
└── expires_at (TIMESTAMP) - Optional expiration date
```

## To Apply This Schema

Run this command:

```powershell
Get-Content ".\db\api_keys_schema.sql" | docker exec -i devlogs-postgres psql -U devlogs -d logsdb
```

Or connect to PostgreSQL manually:

```powershell
docker exec -it devlogs-postgres psql -U devlogs -d logsdb -f /path/to/api_keys_schema.sql
```

## Verify It Worked

```powershell
docker exec -it devlogs-postgres psql -U devlogs -d logsdb -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'api_keys';"
```

Should return:
```
 table_name 
------------
 api_keys
```

---

# Ready for Step 2? 🚀

**Next Step:** Generate API Keys on Signup

We'll create:
1. Helper function to generate secure API keys
2. Update signup controller to auto-create key
3. Return API key in signup response

**Say "yes" or "continue" when you're ready!**
