#!/usr/bin/env bash
# Keeps GymGO on this server up to date by itself (README, "Put GymGO online").
# From the repository's deploy folder:
#
#   bash autoupdate.sh --install   check every hour from now on
#   bash autoupdate.sh --remove    stop checking
#   bash autoupdate.sh             check once, now
#
# A check does nothing unless the branch has a newer commit. Then it waits
# until GitHub's checks on that commit have finished, and goes ahead only if
# none failed (so a change that doesn't build isn't put live), and only as a
# fast-forward (a server with changes of its own is left alone). Going ahead
# is update.sh: the new code, rebuilt, with all the data kept.
#
# What it did goes to ~/gymgo-autoupdate.log. GYMGO_DRY_RUN=1 says what it
# would do without doing it.
set -euo pipefail
cd "$(dirname "$0")"
here=$(pwd)
log="$HOME/gymgo-autoupdate.log"
mark='# gymgo-autoupdate'
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

case "${1:-}" in
  --install)
    # Once an hour, at 23 minutes past (not on the hour, when everything else runs).
    (crontab -l 2>/dev/null | grep -v -- "$mark" || true; echo "23 * * * * cd '$here' && bash autoupdate.sh >> '$log' 2>&1 $mark") | crontab -
    echo "GymGO will now check for updates every hour, at 23 minutes past."
    echo "What it does goes to $log. To stop: bash autoupdate.sh --remove"
    exit 0
    ;;
  --remove)
    (crontab -l 2>/dev/null | grep -v -- "$mark" || true) | crontab -
    echo "Automatic updates are off. Update by hand with: bash update.sh"
    exit 0
    ;;
  "") ;;
  *)
    echo "Use: bash autoupdate.sh [--install | --remove]" >&2
    exit 2
    ;;
esac

branch=$(git rev-parse --abbrev-ref HEAD)
git fetch -q origin "$branch"
mine=$(git rev-parse HEAD)
latest=$(git rev-parse "origin/$branch")
[ "$mine" = "$latest" ] && exit 0

if ! git merge-base --is-ancestor "$mine" "$latest"; then
  echo "$(now) $latest isn't a fast-forward from $mine: left as it is (update by hand)."
  exit 0
fi

# GitHub's checks on the new commit, from its public API (no key needed for a public repository).
repo=$(git remote get-url origin | sed -E 's#^(https://github\.com/|git@github\.com:)##; s#\.git$##')
if ! checks=$(curl -fsS --max-time 20 -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$repo/commits/$latest/check-runs?per_page=100"); then
  echo "$(now) couldn't ask GitHub about $latest; trying again next time."
  exit 0
fi
verdict=$(printf '%s' "$checks" | python3 -c '
import json, sys
runs = json.load(sys.stdin).get("check_runs", [])
if any(run.get("status") != "completed" for run in runs):
    print("waiting")
elif any(run.get("conclusion") not in ("success", "skipped", "neutral") for run in runs):
    print("failed")
else:
    print("ok")
')
case "$verdict" in
  waiting) echo "$(now) GitHub's checks on $latest are still running; trying again next time."; exit 0 ;;
  failed) echo "$(now) a check failed on $latest: not updating to it."; exit 0 ;;
esac

echo "$(now) updating from ${mine:0:7} to ${latest:0:7}"
if [ "${GYMGO_DRY_RUN:-}" = "1" ]; then
  echo "$(now) (dry run: update.sh not run)"
  exit 0
fi
bash update.sh
echo "$(now) now on ${latest:0:7}"
