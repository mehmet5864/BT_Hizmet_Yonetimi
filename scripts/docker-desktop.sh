#!/usr/bin/env bash
# Docker Desktop / Compose V2 yardımcıları (source ile yükleyin).
# shellcheck source=write-env.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/write-env.sh"

compose() {
  export COMPOSE_BAKE=false
  export COMPOSE_ANSI=never
  export BUILDKIT_PROGRESS=plain
  export DOCKER_CLI_HINTS=false
  if docker compose version >/dev/null 2>&1; then
    docker compose --progress plain "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose yok. Docker Desktop’ı güncelleyin (Compose V2 dahildir)."
    return 1
  fi
}

ensure_docker_desktop() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker Desktop gerekli: https://www.docker.com/products/docker-desktop/"
    return 1
  fi
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  echo "Docker motoru kapalı. Docker Desktop başlatılıyor…"
  if [ "$(uname -s)" = "Darwin" ]; then
    open -a Docker 2>/dev/null || true
  elif command -v systemctl >/dev/null 2>&1; then
    systemctl --user start docker-desktop 2>/dev/null || sudo service docker start 2>/dev/null || true
  fi

  for i in $(seq 1 40); do
    if docker info >/dev/null 2>&1; then
      echo "Docker Desktop hazır."
      return 0
    fi
    echo "Docker Desktop bekleniyor ($i/40)…"
    sleep 3
  done

  echo "Motor ayağa kalkmadı. Docker Desktop’ı açıp Linux containers kullanın."
  return 1
}
