#!/bin/bash
# ============================================
# xKMU Business OS - Database Backup Script
# ============================================
# Host-seitiges Backup via docker compose exec
#
# Nutzung:
#   ./docker/scripts/backup.sh                         # Standard-Backup
#   ./docker/scripts/backup.sh -f docker-compose.local.yml  # Anderes Compose-File
#   ./docker/scripts/backup.sh -t scheduled            # Backup-Typ (fuer Rotation)
#   ./docker/scripts/backup.sh -k 30                   # 30 Backups behalten
#
# Cron-Beispiel (taeglich um 2 Uhr):
#   0 2 * * * cd /path/to/xkmu && ./docker/scripts/backup.sh -t scheduled >> /var/log/xkmu-backup.log 2>&1
# ============================================

set -e

# Defaults
COMPOSE_FILE="docker-compose.local.yml"
BACKUP_TYPE="manual"
BACKUP_KEEP=10
BACKUP_DIR="./backups"

# Parse arguments
while getopts "f:t:k:h" opt; do
  case $opt in
    f) COMPOSE_FILE="$OPTARG" ;;
    t) BACKUP_TYPE="$OPTARG" ;;
    k) BACKUP_KEEP="$OPTARG" ;;
    h)
      echo "Usage: $0 [-f compose-file] [-t backup-type] [-k keep-count]"
      echo "  -f  Docker Compose file (default: docker-compose.local.yml)"
      echo "  -t  Backup type label (default: manual)"
      echo "  -k  Number of backups to keep per type (default: 10)"
      exit 0
      ;;
    *) echo "Unknown option: -$OPTARG" >&2; exit 1 ;;
  esac
done

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}-${TIMESTAMP}.sql.gz"

echo "============================================"
echo "xKMU Business OS - Database Backup"
echo "============================================"
echo "Compose file: ${COMPOSE_FILE}"
echo "Backup type:  ${BACKUP_TYPE}"
echo "Output:       ${BACKUP_FILE}"
echo ""

# Check if postgres container is running
if ! docker compose -f "$COMPOSE_FILE" ps postgres --status running --format '{{.Name}}' 2>/dev/null | grep -q .; then
  echo "ERROR: PostgreSQL container is not running."
  echo "Start it with: docker compose -f ${COMPOSE_FILE} up -d postgres"
  exit 1
fi

# Create backup
echo "Creating backup..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U xkmu xkmu_business_os | gzip > "$BACKUP_FILE"

# Integrity check
FILE_SIZE=$(wc -c < "$BACKUP_FILE")
if [ "$FILE_SIZE" -lt 100 ]; then
  echo "ERROR: Backup file is suspiciously small (${FILE_SIZE} bytes)"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "Backup created successfully (${FILE_SIZE} bytes)"

# Rotate backups of same type
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/${BACKUP_TYPE}-*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$BACKUP_KEEP" ]; then
  REMOVE_COUNT=$((BACKUP_COUNT - BACKUP_KEEP))
  echo "Rotating: removing ${REMOVE_COUNT} oldest '${BACKUP_TYPE}' backups (keeping ${BACKUP_KEEP})"
  ls -1t "${BACKUP_DIR}"/${BACKUP_TYPE}-*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
fi

echo ""
echo "Done! Backup saved to: ${BACKUP_FILE}"
