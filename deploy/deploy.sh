#!/usr/bin/env bash
# Pull the latest code, rebuild, run migrations and restart with no manual steps.
# Usage on the server:  bash /opt/bytoloto/deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${BRANCH:-master}"
cd "${APP_DIR}"

[ -f .env ] || { echo "Missing ${APP_DIR}/.env — run deploy/setup-server.sh first" >&2; exit 1; }

missing=()
for key in BETTER_AUTH_SECRET ADMIN_SECRET POSTGRES_PASSWORD SITE_DOMAIN NEXT_PUBLIC_SITE_URL BETTER_AUTH_URL; do
  grep -Eq "^${key}=.+" .env || missing+=("${key}")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Fill these in ${APP_DIR}/.env before deploying: ${missing[*]}" >&2
  exit 1
fi

echo "==> Updating code (${BRANCH})"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Building images"
docker compose build

echo "==> Starting stack (migrations run before the app starts)"
docker compose up -d --remove-orphans

echo "==> Waiting for health check"
for _ in $(seq 1 30); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "App is healthy."
    docker image prune -f >/dev/null
    docker compose ps
    exit 0
  fi
  sleep 5
done

echo "App did not become healthy. Recent logs:" >&2
docker compose logs --tail=80 migrate app caddy >&2
exit 1
