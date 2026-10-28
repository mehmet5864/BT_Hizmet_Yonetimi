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
# Güncellemeden önce otomatik yedek; alınamazsa güncelleme durur. Bilerek atlamak için: BT_YEDEKSIZ=1
DB_CONTAINER="${DB_CONTAINER:-bt-postgres-v4}"
if [ "${BT_YEDEKSIZ:-0}" != "1" ]; then
  if docker ps --filter "name=^${DB_CONTAINER}$" --format '{{.Names}}' | grep -q .; then
    echo "Güncellemeden önce otomatik yedek alınıyor (yedekler klasörü)…"
    if ! bash "$SOURCE/yedekle-docker.sh"; then
      echo "Yedek ALINAMADI, güncelleme durduruldu. Verilere dokunulmadı."
      echo "Bilerek yedeksiz devam etmek için: BT_YEDEKSIZ=1 ./guncelle-docker.sh"
      exit 1
    fi
  else
    echo "Veritabanı konteyneri çalışmıyor (ilk kurulum olabilir); otomatik yedek atlandı."
  fi
fi
docker rm -f envanter-yonetim-v4 >/dev/null 2>&1 || true
compose up --build -d
echo "Güncelleme bitti: http://127.0.0.1:43130"
echo "Sonraki açılış: ./baslat-docker.sh"
