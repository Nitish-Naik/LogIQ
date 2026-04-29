#!/usr/bin/env bash
set -euo pipefail

# Simple DB migration helper
# Usage: PG_URL=postgres://user:pass@host:5432/db ./db/migrate.sh

if [ -z "${PG_URL:-}" ]; then
  echo "PG_URL not set. Falling back to DB_* vars if available."
  if [ -n "${DB_HOST:-}" ]; then
    PG_URL="postgres://${DB_USER:-devlogs}:${DB_PASSWORD:-devlogs}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-logsdb}"
  else
    echo "Set PG_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME to run migrations." >&2
    exit 1
  fi
fi

echo "Using PG_URL: ${PG_URL}"

SQL_DIR="$(dirname "$0")"

for f in "$SQL_DIR"/*.sql; do
  echo "Applying $f"
  PGPASSWORD=$(echo "$PG_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') psql "$PG_URL" -f "$f" || {
    echo "Failed applying $f" >&2
    exit 1
  }
done

echo "Migrations applied."
