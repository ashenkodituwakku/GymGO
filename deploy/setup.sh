#!/usr/bin/env bash
# Sets up GymGO on a fresh Ubuntu server (README, "Put GymGO online").
# From the repository's deploy folder:
#
#   bash setup.sh
#
# The first run makes deploy/.env for you to fill in; the second builds and
# starts GymGO. Safe to run again.
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n== %s\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
fi

# Oracle Cloud's Ubuntu images refuse everything but SSH in the server's own
# firewall. Open the web ports there; the cloud's firewall is opened in its
# console (README says where).
if sudo iptables -S INPUT 2>/dev/null | grep -q -- '-j REJECT'; then
  say "Opening ports 80 and 443 in this server's firewall"
  for rule in "tcp 80" "tcp 443" "udp 443"; do
    set -- $rule
    sudo iptables -C INPUT -p "$1" --dport "$2" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p "$1" --dport "$2" -j ACCEPT
  done
  if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save; fi
fi
if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q 'Status: active'; then
  sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
fi

if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  say "Made deploy/.env. Fill it in (GYMGO_DOMAIN and GYMGO_PUBLIC_URL at least), for example with: nano .env"
  echo "Then run this again: bash setup.sh"
  exit 0
fi
if grep -q '^GYMGO_DOMAIN=gymgo.example.com' .env; then
  echo "Set GYMGO_DOMAIN and GYMGO_PUBLIC_URL in deploy/.env first (nano .env), then run this again."
  exit 1
fi
chmod 600 .env

# The server runs as user 1000 inside its container, and keeps its database,
# photos and backups here.
mkdir -p data
sudo chown -R 1000:1000 data

say "Building and starting GymGO (the first time takes a few minutes)"
sudo docker compose up -d --build
url=$(grep '^GYMGO_PUBLIC_URL=' .env | cut -d= -f2-)
say "Done. GymGO is starting at $url"
echo "Caddy gets its HTTPS certificate in a minute or so. To watch: sudo docker compose logs -f"
