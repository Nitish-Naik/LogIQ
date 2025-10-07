# Quick Start Guide - Authentication

## One-Command Start (Windows)

```batch
start-auth.bat
```

This will:
1. Start Docker containers (PostgreSQL, Redis)
2. Install auth-service dependencies
3. Start auth-service on port 3003
4. Start frontend on port 5173

## One-Command Start (Mac/Linux)

```bash
chmod +x start-auth.sh
./start-auth.sh
```

## Manual Setup (Step by Step)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

### 2. Setup Database Schema

```bash
docker exec -i devlogs-postgres psql -U devlogs -d logsdb < db/auth_schema.sql
```

Or manually:
```bash
docker exec -it devlogs-postgres psql -U devlogs -d logsdb
# Then paste contents of db/auth_schema.sql
```

### 3. Install & Start Auth Service

```bash
cd auth-service
npm install
npm run dev
```

### 4. Start Frontend

```bash
cd log-stream-buddy
npm run dev
```

## Access Points

- **Frontend**: http://localhost:5173
- **Auth API**: http://localhost:3003
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **PgAdmin**: http://localhost:8082
- **Redis Commander**: http://localhost:8081

## Test the Authentication

1. Go to http://localhost:5173/signup
2. Create an account:
   - Email: test@example.com
   - Password: password123
   - Organization: Test Org
3. You should be redirected to the dashboard
4. Try logging out and signing back in

## Verify Database

```bash
docker exec -it devlogs-postgres psql -U devlogs -d logsdb

# Check users
SELECT id, email, organization_id, role, created_at FROM users;

# Check organizations
SELECT * FROM organizations;
```

## Stop Services

```bash
# Stop Docker containers
docker-compose down

# Stop auth-service (Ctrl+C in terminal)
# Stop frontend (Ctrl+C in terminal)
```

## Troubleshooting

### Port Already in Use
If ports are in use:
- Change PORT in auth-service/.env
- Update VITE_API_BASE_URL in log-stream-buddy/.env

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps

# Check logs
docker logs devlogs-postgres

# Restart container
docker-compose restart postgres
```

### Auth Service Won't Start
```bash
# Check if dependencies are installed
cd auth-service
npm install

# Check .env file exists
cat .env

# Check port 3003 is available
netstat -ano | findstr :3003  # Windows
lsof -i :3003                 # Mac/Linux
```

### CORS Errors
- Make sure auth-service is running on port 3003
- Make sure frontend is on port 5173
- Check CORS settings in auth-service/src/server.js

## Next Steps

1. Create an account at /signup
2. Test signin/logout flow
3. Check browser DevTools > Application > Local Storage for tokens
4. Verify protected routes work
5. Read AUTH_IMPLEMENTATION.md for full details
