#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/docker-desktop.sh
. "$ROOT/scripts/docker-desktop.sh"
ensure_docker_desktop
write_app_env "$ROOT"

echo "Docker Desktop imajı derleniyor. İlk sefer birkaç dakika sürebilir…"
docker rm -f envanter-yonetim-v4 >/dev/null 2>&1 || true
compose up --build -d
date -Iseconds > .kurulum-ok

ready=0
for i in $(seq 1 40); do
  if curl -sf --connect-timeout 2 -o /dev/null http://127.0.0.1:43130/giris; then
    ready=1
    break
  fi
  echo "Bekleniyor ($i/40)…"
  sleep 3
done

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:43130/giris" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:43130/giris" || true
fi

if [ "$ready" = 1 ]; then
  echo "Hazır: http://127.0.0.1:43130"
else
  echo "Konteyner ayağa kalktı. Tarayıcıyı bir dakika sonra yenileyin: http://127.0.0.1:43130/giris"
fi
echo "Sonraki açılış: ./baslat-docker.sh"
echo "Durdurmak: ./durdur-docker.sh   (down -v kullanmayın, veriyi siler)"
echo "Güncellemek: yeni zip’ten ./guncelle-docker.sh"
