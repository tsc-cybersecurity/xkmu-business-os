#!/bin/bash
# ============================================
# xKMU Business OS - Database Restore Script
# ============================================
# Stellt eine Datenbank aus einem Backup wieder her.
#
# Nutzung:
#   ./docker/scripts/restore.sh backups/manual-20260227_140000.sql.gz
#   ./docker/scripts/restore.sh -f docker-compose.local.yml backups/backup.sql.gz
#   ./docker/scripts/restore.sh -y backups/backup.sql.gz   # Ohne Bestaetigungsabfrage
# ============================================

set -e

# Defaults
COMPOSE_FILE="docker-compose.local.yml"
AUTO_YES=false

# Parse arguments
while getopts "f:yh" opt; do
  case $opt in
    f) COMPOSE_FILE="$OPTARG" ;;
    y) AUTO_YES=true ;;
    h)
      echo "Usage: $0 [-f compose-file] [-y] <backup-file.sql.gz>"
      echo "  -f  Docker Compose file (default: docker-compose.local.yml)"
      echo "  -y  Skip confirmation prompt"
      exit 0
      ;;
    *) echo "Unknown option: -$OPTARG" >&2; exit 1 ;;
  esac
done
shift $((OPTIND - 1))

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "ERROR: No backup file specified."
  echo ""
  echo "Available backups:"
  ls -lht ./backups/*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  echo ""
  echo "Usage: $0 [-f compose-file] [-y] <backup-file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "============================================"
echo "xKMU Business OS - Database Restore"
echo "============================================"
echo "Compose file: ${COMPOSE_FILE}"
echo "Backup file:  ${BACKUP_FILE}"
echo ""
echo "WARNING: This will:"
echo "  1. Create a safety backup of the current database"
echo "  2. Stop the app container"
echo "  3. Drop and recreate the database"
echo "  4. Restore from the specified backup"
echo ""

if [ "$AUTO_YES" = false ]; then
  read -p "Continue? (y/N) " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# Check if postgres container is running
if ! docker compose -f "$COMPOSE_FILE" ps postgres --status running --format '{{.Name}}' 2>/dev/null | grep -q .; then
  echo "ERROR: PostgreSQL container is not running."
  echo "Start it with: docker compose -f ${COMPOSE_FILE} up -d postgres"
  exit 1
fi

# Step 1: Safety backup
echo ""
echo "[1/4] Creating safety backup before restore..."
SAFETY_DIR="./backups"
mkdir -p "$SAFETY_DIR"
SAFETY_FILE="${SAFETY_DIR}/pre-restore-$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U xkmu xkmu_business_os | gzip > "$SAFETY_FILE"

SAFETY_SIZE=$(wc -c < "$SAFETY_FILE")
if [ "$SAFETY_SIZE" -lt 100 ]; then
  echo "WARNING: Safety backup seems empty (${SAFETY_SIZE} bytes) - database may be empty"
else
  echo "Safety backup created: ${SAFETY_FILE} (${SAFETY_SIZE} bytes)"
fi

# Step 2: Stop app container
echo ""
echo "[2/4] Stopping app container..."
docker compose -f "$COMPOSE_FILE" stop app 2>/dev/null || true

# Step 3: Drop and recreate database
echo ""
echo "[3/4] Dropping and recreating database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U xkmu -d postgres -c "DROP DATABASE IF EXISTS xkmu_business_os;"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U xkmu -d postgres -c "CREATE DATABASE xkmu_business_os OWNER xkmu;"

# Step 4: Restore
echo ""
echo "[4/4] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U xkmu -d xkmu_business_os --single-transaction -q

echo ""
echo "============================================"
echo "Restore complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Start the app: docker compose -f ${COMPOSE_FILE} up -d app"
echo "     (drizzle-kit push will sync any new schema changes on startup)"
echo "  2. Verify the application works correctly"
echo ""
echo "If something went wrong, restore the safety backup:"
echo "  $0 -f ${COMPOSE_FILE} ${SAFETY_FILE}"
