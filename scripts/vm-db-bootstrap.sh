#!/usr/bin/env bash
set -euo pipefail

mkdir -p /opt/zhicetong
cd /opt/zhicetong

if command -v docker >/dev/null 2>&1; then
  :
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if docker compose version >/dev/null 2>&1; then
  :
elif command -v docker-compose >/dev/null 2>&1; then
  alias docker-compose='docker compose'
else
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL https://github.com/docker/compose/releases/download/v2.40.1/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

docker compose -f /opt/zhicetong/vm-db-compose.yml up -d

