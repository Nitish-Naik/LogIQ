#!/usr/bin/env bash
set -e

echo "Starting infrastructure with docker compose..."
docker compose up -d

echo "Installing dependencies for services (this may take a while)..."
for d in auth-service collector query-service dashboard sample-app-requests; do
  if [ -d "$d" ]; then
    echo "-> Installing in $d"
    (cd "$d" && npm install)
  fi
done

echo "Starting backend services in background (auth, collector, query, dashboard)..."
# start services in background so this script returns
(cd auth-service && npm run dev &) || true
(cd collector && npm run dev &) || true
(cd query-service && npm run dev &) || true
(cd dashboard && npm run dev &) || true

echo "All commands launched. Check ports or use 'ps' to inspect running processes."
echo "If you prefer to run services in foreground, open separate terminals and run 'npm run dev' inside each service folder."
