# Auth Service

Overview
- The Auth Service manages users, organizations, and API keys. It issues JWTs for UI sessions and returns API keys (plain text only once) for external applications to send logs.

Quick start

1. Install dependencies:

```bash
cd auth-service
npm install
```

2. Run in development:

```bash
npm run dev
```

Seed demo data

```bash
npm run seed
```

Configuration
- See `auth-service/.env.example` for required environment variables. Important ones:
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`

API endpoints (selected)
- `POST /api/auth/signup` — create user + organization and return initial API key
- `POST /api/auth/signin` — login
- `POST /api/auth/keys` — create API key (requires auth)
- `GET /api/auth/keys` — list keys for current user
- `DELETE /api/auth/keys/:id` — revoke key
- `GET /health` — health check

Notes
- API keys are hashed before storage (SHA-256). The plain key is returned only at creation time.
- For production, set a strong `JWT_SECRET` and ensure TLS for all endpoints.
