#!/bin/sh
set -e

echo "============================================"
echo "xKMU Business OS - Starting..."
echo "============================================"

# Wait for database to be ready
echo "Waiting for database..."
until nc -z postgres 5432; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# Run seed if needed (checks if default tenant exists)
echo "Checking if seed is needed..."
npx tsx src/lib/db/seed-check.ts

# Start the application
echo "Starting Next.js..."
exec npm run dev
