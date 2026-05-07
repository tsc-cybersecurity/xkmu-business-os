#!/bin/bash
# ============================================
# xKMU Business OS - Pre-built Image Deploy
# ============================================
# Zieht das aktuelle GHCR-Image und startet den Stack neu.
# Ersetzt das alte "docker compose up -d --build" mit ~5-10s Downtime
# statt 3+ Minuten Build-Wartezeit.
#
# Setup:
#   1. APP_IMAGE in /home/sten00/xkmu-business-os/.env eintragen, z.B.:
#      APP_IMAGE=ghcr.io/tsc-cybersecurity/xkmu-business-os:latest
#   2. Bei privatem GHCR-Repo: einmalig docker login ghcr.io
#   3. Skript ausfuehrbar machen: chmod +x docker/scripts/deploy.sh
#
# Aufruf:
#   ./docker/scripts/deploy.sh           # latest
#   ./docker/scripts/deploy.sh v1.5.654  # spezifische Version
# ============================================
set -euo pipefail

cd "$(dirname "$0")/../.."

COMPOSE_FILE="docker-compose.local.yml"
SERVICE="app"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

# Docker ohne sudo verfuegbar? Sonst sudo -E davorhaengen (preserve env).
# Sauberer waere: User in 'docker'-Gruppe (sudo usermod -aG docker $USER + relogin).
if docker info >/dev/null 2>&1; then
  DOCKER="docker"
else
  # -E: APP_IMAGE und andere env vars an docker durchreichen.
  DOCKER="sudo -E docker"
  echo "INFO: docker erfordert sudo — ggf. wirst du nach dem Passwort gefragt."
fi

# Tag-Override per CLI: ./deploy.sh v1.5.654
if [ $# -ge 1 ]; then
  TAG="$1"
  if [[ ! "$TAG" =~ ^(v[0-9]|sha-|latest|main) ]]; then
    echo "WARN: Tag '$TAG' folgt nicht dem ueblichen Schema (v*, sha-*, latest, main)"
  fi
  REPO="${APP_IMAGE_REPO:-ghcr.io/tsc-cybersecurity/xkmu-business-os}"
  export APP_IMAGE="${REPO}:${TAG}"
  echo "→ Override: APP_IMAGE=${APP_IMAGE}"
fi

echo "============================================"
echo "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Image:  ${APP_IMAGE:-<aus .env>}"
echo "============================================"

echo "→ 1/4  Pull image..."
$DOCKER compose -f "$COMPOSE_FILE" pull "$SERVICE"

echo "→ 2/4  Stack starten / aktualisieren..."
$DOCKER compose -f "$COMPOSE_FILE" up -d --no-build "$SERVICE"

echo "→ 3/4  Warte auf Healthcheck (max ${HEALTH_TIMEOUT}s)..."
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
while true; do
  if curl -fsS -o /dev/null --max-time 5 "$HEALTH_URL"; then
    echo "   ✓ App ist healthy"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "   ✗ Healthcheck-Timeout — letzte Logs:"
    $DOCKER compose -f "$COMPOSE_FILE" logs --tail=50 "$SERVICE"
    exit 1
  fi
  sleep 3
done

echo "→ 4/4  Alte Images aufraeumen (dangling)..."
$DOCKER image prune -f >/dev/null

echo "============================================"
echo "Deploy erfolgreich."
echo "============================================"
