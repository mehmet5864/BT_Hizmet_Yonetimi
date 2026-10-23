#!/usr/bin/env bash
# Veritabanı (PostgreSQL) + dosyalar (lisans, yüklemeler) yedeği -> ./yedekler
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PROJECT="${COMPOSE_PROJECT_NAME:-bt-hizmet-yonetimi-v4}"
DB_CONTAINER="${DB_CONTAINER:-bt-postgres-v4}"
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p yedekler

echo "Veritabanı yedeği alınıyor…"
docker exec "$DB_CONTAINER" sh -c "pg_dump -U bt -d bt --clean --if-exists | gzip > /tmp/yedek.sql.gz"
docker cp "$DB_CONTAINER:/tmp/yedek.sql.gz" "yedekler/db-$TS.sql.gz"
docker exec "$DB_CONTAINER" rm -f /tmp/yedek.sql.gz

echo "Dosyalar (lisans, yüklemeler) yedeği alınıyor…"
docker run --rm \
  -v "${PROJECT}_envanter-data:/data:ro" \
  -v "${PROJECT}_envanter-uploads:/uploads:ro" \
  -v "$ROOT/yedekler:/out" \
  postgres:16-alpine tar czf "/out/dosyalar-$TS.tar.gz" -C / data uploads

echo "Tamam: yedekler/db-$TS.sql.gz  ve  yedekler/dosyalar-$TS.tar.gz"
