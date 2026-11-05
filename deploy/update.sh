#!/usr/bin/env bash
# Gets the latest GymGO and restarts it with the new code, keeping its data
# (README, "Put GymGO online"). From the repository's deploy folder:
#
#   bash update.sh
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
sudo docker compose up -d --build
# Old images only take up room.
sudo docker image prune -f >/dev/null
echo "GymGO is up to date."
