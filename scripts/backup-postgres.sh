#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/opt/salgados-r/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/salgadosr-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="${PGPASSWORD:-salgadosr}" pg_dump \
  -h "${PGHOST:-salgados-r-db}" \
  -p "${PGPORT:-5432}" \
  -U "${PGUSER:-salgadosr}" \
  "${PGDATABASE:-salgadosr}" | gzip > "$FILE"

find "$BACKUP_DIR" -name 'salgadosr-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$FILE"
