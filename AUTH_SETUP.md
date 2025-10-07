# Authentication Setup Guide

## Overview
This guide will help you set up the authentication system for Instant Dev Logs.

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (running via Docker or locally)
- npm or yarn

## Setup Steps

### 1. Database Setup

First, run the authentication schema SQL file to create the necessary tables:

```bash
# Connect to PostgreSQL
docker exec -it devlogs-postgres psql -U devlogs -d logsdb

# Then run the schema file
\i /path/to/db/auth_schema.sql

# Or copy-paste the contents of db/auth_schema.sql
```

Alternatively, you can run it directly:
```bash
docker exec -i devlogs-postgres psql -U devlogs -d logsdb < db/auth_schema.sql
```

### 2. Auth Service Setup

Navigate to the auth-service directory and install dependencies:

```bash
cd auth-service
npm install
```

Copy the environment file:
```bash
cp .env.example .env
```

Update `.env` with your settings (the defaults should work if using Docker):
- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_NAME=logsdb`
- `DATABASE_USER=devlogs`
- `DATABASE_PASSWORD=devlogs123`
- Update JWT secrets for production!

Start the auth service:
```bash
npm run dev
```

The service should now be running on `http://localhost:3003`

### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd log-stream-buddy
```

Make sure you have the `.env` file with:
```
VITE_API_BASE_URL=http://localhost:3003
```

The dependencies should already be installed. If not:
```bash
npm install
```

Start the frontend:
```bash
npm run dev
```

The frontend should now be running on `http://localhost:5173`

### 4. Testing the Authentication

1. Open your browser and navigate to `http://localhost:5173/signup`
2. Fill in the signup form:
   - Email: test@example.com
   - Password: password123
   - Organization: Test Organization
3. Click "Create Account"
4. You should be redirected to the dashboard
5. Try logging out and signing in again at `http://localhost:5173/login`

### 5. Verify Database

You can verify the user was created by checking the database:

```bash
docker exec -it devlogs-postgres psql -U devlogs -d logsdb

# Check organizations
SELECT * FROM organizations;

# Check users (password will be hashed)
SELECT id, email, organization_id, role, created_at FROM users;
```

## API Endpoints

### Public Endpoints
- `POST /api/auth/signup` - Create new user and organization
- `POST /api/auth/signin` - Sign in existing user
- `POST /api/auth/refresh-token` - Refresh access token

### Protected Endpoints
- `GET /api/auth/me` - Get current user details

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Check connection details in auth-service/.env
- Verify the database exists: `docker exec -it devlogs-postgres psql -U devlogs -l`

### CORS Issues
- The auth service allows localhost:5173 and localhost:3000
- Check the CORS configuration in `auth-service/src/server.js`

### Token Issues
- Tokens are stored in localStorage
- Clear localStorage in browser DevTools if you encounter issues
- Make sure JWT_SECRET is set in auth-service/.env

### Port Conflicts
- Auth service runs on port 3003
- Change PORT in auth-service/.env if needed
- Update VITE_API_BASE_URL in frontend .env accordingly

## Architecture

```
Frontend (React + Vite)
    ↓
API Service (apiService.ts)
    ↓
Auth Service (Express)
    ↓
PostgreSQL Database
```

## Security Notes

⚠️ **Important for Production:**
1. Change all JWT secrets in `.env`
2. Use HTTPS for all API calls
3. Implement rate limiting
4. Add CSRF protection
5. Enable secure cookies
6. Add email verification
7. Implement password reset flow
8. Add account lockout after failed attempts
9. Use environment-specific CORS settings

## Next Steps

- [ ] Add email verification
- [ ] Implement password reset
- [ ] Add two-factor authentication
- [ ] Create user profile management
- [ ] Add role-based access control (RBAC)
- [ ] Implement session management
- [ ] Add audit logging
