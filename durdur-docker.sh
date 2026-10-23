#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/docker-desktop.sh
. "$ROOT/scripts/docker-desktop.sh"
ensure_docker_desktop
echo "Konteyner duruyor. Volume’lar (veri) kalıyor. down -v kullanılmıyor."
compose down
echo "Durdu. Tekrar: ./baslat-docker.sh"
