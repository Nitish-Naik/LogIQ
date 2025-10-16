# Auth Service

Authentication service for Instant Dev Logs platform.

## Features

- User signup with organization creation
- User signin with JWT tokens
- Token refresh mechanism
- Protected routes with JWT middleware
- Password hashing with bcrypt
- Input validation with Joi

## API Endpoints

### Public Endpoints

#### POST /api/auth/signup
Create a new user and organization.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "organizationName": "My Organization"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "organizationId": "uuid",
    "organizationName": "My Organization",
    "role": "admin"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### POST /api/auth/signin
Sign in an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "organizationId": "uuid",
    "organizationName": "My Organization",
    "role": "admin"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### POST /api/auth/refresh-token
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

### Protected Endpoints

#### GET /api/auth/me
Get current user details.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "organizationId": "uuid",
    "organizationName": "My Organization",
    "role": "admin"
  }
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

3. Run the database migrations (see db/init.sql)

4. Start the service:
```bash
npm run dev
```

## Environment Variables

- `PORT`: Server port (default: 3003)
- `DATABASE_HOST`: PostgreSQL host
- `DATABASE_PORT`: PostgreSQL port
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database user
- `DATABASE_PASSWORD`: Database password
- `JWT_SECRET`: Secret for access tokens
- `JWT_EXPIRES_IN`: Access token expiration (e.g., '7d')
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (e.g., '30d')
