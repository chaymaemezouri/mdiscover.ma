#!/usr/bin/env sh
# Restauration PostgreSQL depuis un dump gzip
# Usage: ./scripts/restore-db.sh backups/mdiscover_YYYYMMDD_HHMMSS.sql.gz

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <fichier.sql.gz>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-mdiscover-postgres-prod}"
DUMP_FILE="$1"

if [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
fi

echo "ATTENTION: restauration de $DUMP_FILE vers $CONTAINER / ${POSTGRES_DB}"
gunzip -c "$DUMP_FILE" | docker exec -i "$CONTAINER" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
echo "Restauration terminée"
