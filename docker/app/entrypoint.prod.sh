#!/bin/sh
set -e

echo "============================================"
echo "xKMU Business OS - Production Start"
echo "============================================"

# ------------------------------------
# Fix volume permissions (runs as root)
# ------------------------------------
echo "Ensuring data directories exist and are writable..."
mkdir -p /app/data/uploads/bi /app/data/uploads/media /backups
chown -R nextjs:nodejs /app/data /backups

# ------------------------------------
# Wait for database to be ready
# ------------------------------------
echo "Waiting for database..."
until nc -z postgres 5432; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# ------------------------------------
# Pre-migration backup
# ------------------------------------
BACKUP_DIR="/backups"
BACKUP_KEEP="${BACKUP_KEEP:-10}"

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

create_backup() {
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${BACKUP_DIR}/pre-migration-${TIMESTAMP}.sql.gz"

  echo "Creating pre-migration backup: ${BACKUP_FILE}"
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

  # Integrity check: file must be > 100 bytes
  FILE_SIZE=$(wc -c < "$BACKUP_FILE")
  if [ "$FILE_SIZE" -lt 100 ]; then
    echo "WARNING: Backup file is suspiciously small (${FILE_SIZE} bytes), removing it"
    rm -f "$BACKUP_FILE"
    return 1
  fi

  echo "Backup created successfully (${FILE_SIZE} bytes)"
  return 0
}

rotate_backups() {
  # Count existing pre-migration backups and remove oldest if over limit
  BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/pre-migration-*.sql.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt "$BACKUP_KEEP" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - BACKUP_KEEP))
    echo "Rotating backups: removing ${REMOVE_COUNT} oldest (keeping ${BACKUP_KEEP})"
    ls -1t "${BACKUP_DIR}"/pre-migration-*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
  fi
}

# Check if backup directory is writable
if [ -d "$BACKUP_DIR" ] && [ -w "$BACKUP_DIR" ]; then
  # Check if database has any tables (skip backup for empty/new DB)
  TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")

  if [ "$TABLE_COUNT" -gt "0" ]; then
    if create_backup; then
      rotate_backups
    else
      echo "WARNING: Pre-migration backup failed, continuing anyway..."
    fi
  else
    echo "INFO: Empty database detected, skipping pre-migration backup"
  fi
else
  echo "WARNING: Backup directory not available or not writable, skipping backup"
  echo "  Mount a volume to /backups to enable automatic pre-migration backups"
fi

# ------------------------------------
# Sync database schema via Drizzle
# ------------------------------------
echo "Syncing database schema..."
npx drizzle-kit push --force
echo "Schema sync complete!"

# ------------------------------------
# Run seed if needed
# ------------------------------------
echo "Checking if seed is needed..."
npx tsx src/lib/db/seed-check.ts

# ------------------------------------
# Start the application
# ------------------------------------
echo "Starting Next.js production server..."
exec su-exec nextjs node server.js
