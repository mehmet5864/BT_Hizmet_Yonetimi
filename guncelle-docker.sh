#!/usr/bin/env bash
set -euo pipefail
SOURCE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/docker-desktop.sh
. "$SOURCE/scripts/docker-desktop.sh"
ensure_docker_desktop

echo "Bu paket klasöründen imaj derlenecek. Kayıtlar PostgreSQL volume’unda kalır."
echo "Node.js gerekmez. docker compose down -v kullanmayın."
write_app_env "$SOURCE" 2>/dev/null || true
cd "$SOURCE"
docker rm -f envanter-yonetim-v4 >/dev/null 2>&1 || true
compose up --build -d
echo "Güncelleme bitti: http://127.0.0.1:43130"
echo "Sonraki açılış: ./baslat-docker.sh"
