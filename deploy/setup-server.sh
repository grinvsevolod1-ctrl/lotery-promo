#!/usr/bin/env bash
# One-time bootstrap of a fresh Ubuntu 22.04+ (or Debian 12) VPS for bytoloto.com.
# Run as root:  bash deploy/setup-server.sh
# Safe to re-run: every step checks whether it has already been done.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bytoloto}"
REPO_URL="${REPO_URL:-git@github.com:grinvsevolod1-ctrl/lotery-promo.git}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:-bytoloto.com}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root" >&2; exit 1; }

log "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades openssl
dpkg-reconfigure -f noninteractive unattended-upgrades

log "Docker"
if ! command -v docker >/dev/null 2>&1; then
  # get.docker.com may lag behind brand-new Ubuntu releases; fall back to the distro packages.
  curl -fsSL https://get.docker.com | sh || apt-get install -y docker.io docker-compose-v2 docker-buildx
fi
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-v2
systemctl enable --now docker

log "Swap (helps the Next.js build on small servers)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban

log "Code in ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}"

log "Environment file"
if [ ! -f .env ]; then
  cp deploy/env.production.example .env
  sed -i \
    -e "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" \
    -e "s|^ADMIN_SECRET=.*|ADMIN_SECRET=$(openssl rand -hex 24)|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
    -e "s|^CRON_SECRET=.*|CRON_SECRET=$(openssl rand -hex 32)|" \
    -e "s|^UMAMI_APP_SECRET=.*|UMAMI_APP_SECRET=$(openssl rand -hex 32)|" \
    .env
  chmod 600 .env
  echo "Created .env with generated secrets. Fill in the remaining values (Telegram, mail, operator details)."
fi

log "Origin certificate"
mkdir -p deploy/certs
if [ ! -f deploy/certs/origin.pem ]; then
  # Self-signed fallback: works with Cloudflare SSL mode "Full".
  # Replace with a Cloudflare Origin Certificate and switch to "Full (strict)".
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout deploy/certs/origin.key -out deploy/certs/origin.pem \
    -subj "/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:*.${DOMAIN}"
fi
chmod 644 deploy/certs/origin.pem
chmod 644 deploy/certs/origin.key

log "Done"
echo "Next: edit ${APP_DIR}/.env, then run: bash ${APP_DIR}/deploy/deploy.sh"
