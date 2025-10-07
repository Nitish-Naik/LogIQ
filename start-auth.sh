#!/bin/bash

echo "Starting Instant Dev Logs with Authentication..."
echo ""

echo "[1/5] Starting Docker containers (PostgreSQL, Redis)..."
docker-compose up -d
sleep 5

echo ""
echo "[2/5] Installing auth-service dependencies..."
cd auth-service
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed."
fi

echo ""
echo "[3/5] Starting auth-service on port 3003..."
npm run dev &
AUTH_PID=$!
cd ..

echo ""
echo "[4/5] Starting frontend on port 5173..."
cd log-stream-buddy
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "[5/5] All services started!"
echo ""
echo "================================"
echo "Services Running:"
echo "================================"
echo "PostgreSQL:       http://localhost:5432"
echo "Redis:            http://localhost:6379"
echo "Redis Commander:  http://localhost:8081"
echo "PgAdmin:          http://localhost:8082"
echo "Auth Service:     http://localhost:3003"
echo "Frontend:         http://localhost:5173"
echo "================================"
echo ""
echo "To setup database schema, run:"
echo "docker exec -i devlogs-postgres psql -U devlogs -d logsdb < db/auth_schema.sql"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for background processes
wait $AUTH_PID $FRONTEND_PID
