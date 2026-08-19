#!/usr/bin/env sh
# Sauvegarde PostgreSQL (à planifier en cron sur le VPS)
# Usage: ./scripts/backup-db.sh
# Restauration: gunzip -c backups/xxx.sql.gz | docker exec -i mdiscover-postgres-prod psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
CONTAINER="${POSTGRES_CONTAINER:-mdiscover-postgres-prod}"

mkdir -p "$BACKUP_DIR"

# Charge .env si présent
if [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
fi

FILE="${BACKUP_DIR}/mdiscover_${TIMESTAMP}.sql.gz"

echo "Backup → $FILE"
docker exec "$CONTAINER" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "$FILE"
echo "OK"
