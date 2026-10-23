#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/docker-desktop.sh
. "$ROOT/scripts/docker-desktop.sh"
ensure_docker_desktop
write_app_env "$ROOT"

if [ ! -f docker-compose.yml ]; then
  echo "docker-compose.yml yok. Zip’i tam çıkarın, sonra ./install-docker.sh çalıştırın."
  exit 1
fi

echo "Konteyner başlatılıyor (yeniden derlenmez, veriler volume’da)…"
compose up -d

ready=0
for i in $(seq 1 30); do
  if curl -sf --connect-timeout 2 -o /dev/null http://127.0.0.1:43130/giris; then
    ready=1
    break
  fi
  echo "Bekleniyor ($i/30)…"
  sleep 2
done

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:43130/giris" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:43130/giris" || true
fi

if [ "$ready" = 1 ]; then
  echo "Hazır: http://127.0.0.1:43130"
else
  echo "Motor çalışıyor. Tarayıcıyı biraz sonra yenileyin: http://127.0.0.1:43130/giris"
fi
