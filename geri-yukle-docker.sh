#!/usr/bin/env bash
# Kullanım: ./geri-yukle-docker.sh yedekler/db-YYYYMMDD-HHMMSS.sql.gz [yedekler/dosyalar-YYYYMMDD-HHMMSS.tar.gz]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PROJECT="${COMPOSE_PROJECT_NAME:-bt-hizmet-yonetimi-v4}"
DB_CONTAINER="${DB_CONTAINER:-bt-postgres-v4}"
DB_FILE="${1:-}"
FILES_FILE="${2:-}"
if [ -z "$DB_FILE" ] || [ ! -f "$DB_FILE" ]; then
  echo "Kullanım: ./geri-yukle-docker.sh yedekler/db-....sql.gz [yedekler/dosyalar-....tar.gz]"
  exit 1
fi
read -r -p "Mevcut veritabanının ÜZERİNE yazılacak. Devam? (evet/hayır) " ans
[ "$ans" = "evet" ] || { echo "İptal."; exit 1; }

docker compose stop envanter || true
docker cp "$DB_FILE" "$DB_CONTAINER:/tmp/geri.sql.gz"
docker exec "$DB_CONTAINER" sh -c "gunzip -c /tmp/geri.sql.gz | psql -U bt -d bt -v ON_ERROR_STOP=0 -q"
docker exec "$DB_CONTAINER" rm -f /tmp/geri.sql.gz

if [ -n "$FILES_FILE" ] && [ -f "$FILES_FILE" ]; then
  DIR="$(cd "$(dirname "$FILES_FILE")" && pwd)"
  docker run --rm \
    -v "${PROJECT}_envanter-data:/data" \
    -v "${PROJECT}_envanter-uploads:/uploads" \
    -v "$DIR:/in:ro" \
    postgres:16-alpine tar xzf "/in/$(basename "$FILES_FILE")" -C /
fi
docker compose start envanter
echo "Geri yükleme tamam."
