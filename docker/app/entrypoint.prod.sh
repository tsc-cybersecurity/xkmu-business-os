#!/bin/sh
set -e

echo "============================================"
echo "xKMU Business OS - Production Start"
echo "============================================"

# Wait for database to be ready
echo "Waiting for database..."
until nc -z postgres 5432; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# Sync database schema via Drizzle
echo "Syncing database schema..."
npx drizzle-kit push --force
echo "Schema sync complete!"

# Run seed if needed (checks if default tenant exists)
echo "Checking if seed is needed..."
node seed-check.js

# Start the application
echo "Starting Next.js production server..."
exec node server.js
