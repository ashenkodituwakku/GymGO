#!/usr/bin/env bash
# Start GymGO on a Mac.
#
#   bash ~/GymGO/scripts/gymgo-mac.sh            server + app in your browser, QR code for Expo Go
#   bash ~/GymGO/scripts/gymgo-mac.sh --xcode    server + open GymGO in Xcode, to run on the
#                                                Simulator or your iPhone
#
# Options:
#   --update           pull the latest GymGO first
#   --team ABCDE12345  (with --xcode) sign with this Apple team, so Xcode doesn't ask
#   --clean            (with --xcode) make the Xcode project again from scratch
#   --tunnel           (Expo Go) for a phone on a different network
#   --no-browser       (Expo Go) don't open a browser window
#   --no-dev-account   leave out the ready-made Pro account (dev@gymgo.test)
#   --path DIR         where GymGO lives (default ~/GymGO; downloaded there if missing)
#
# Everything it installs is free, and it never signs you up for anything.
# Ctrl+C stops it all.

set -euo pipefail

REPO_URL='https://github.com/ashenkodituwakku/GymGO.git'
BRANCH='claude/friendly-johnson-9rzxrj'
MIN_NODE='22.13.0'
PNPM_VERSION='10.33.0'

path="$HOME/GymGO"
update=0
dev_account=1
pass=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --update) update=1 ;;
    --no-dev-account) dev_account=0 ;;
    --path) path="$2"; shift ;;
    --team) pass+=("--team" "$2"); shift ;;
    --xcode | --clean | --tunnel | --no-browser) pass+=("$1") ;;
    -h | --help) sed -n '2,19p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '  \033[36m>\033[0m  %s\n' "$1"; }
done_() { printf '  \033[32mOK\033[0m %s\n' "$1"; }
stop() { printf '\n  \033[31mX\033[0m  %s\n     %s\n\n' "$1" "$2" >&2; exit 1; }

printf '\n  GymGO\n\n'

# --- Node --------------------------------------------------------------------
command -v node >/dev/null || stop 'Node.js is not installed.' 'Install it from https://nodejs.org (the LTS), or with Homebrew: brew install node'
node_version="$(node --version | sed 's/^v//')"
# Compared in Node itself: the sort that comes with older macOS can't order versions.
if ! node -e 'const [a, b] = process.argv.slice(1).map((v) => v.split(".").map(Number)); process.exit((a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) >= 0 ? 0 : 1)' "$node_version" "$MIN_NODE"; then
  stop "Node.js $node_version is too old; GymGO needs $MIN_NODE or newer." 'Update from https://nodejs.org, or: brew upgrade node'
fi
done_ "Node.js $node_version"

# --- Checkout ----------------------------------------------------------------
if [[ ! -f "$path/package.json" ]]; then
  command -v git >/dev/null || stop 'Git is not installed.' 'Run: xcode-select --install   (Apple’s free command line tools include Git)'
  step "Downloading GymGO into $path"
  git clone --branch "$BRANCH" "$REPO_URL" "$path" || stop 'The download failed.' 'Check you are signed in to GitHub and have access to the repository.'
elif [[ $update -eq 1 ]]; then
  step 'Pulling the latest changes'
  git -C "$path" pull --ff-only || stop 'Could not update cleanly.' "You may have local edits in $path. Commit or stash them, then try again."
fi
done_ "Project at $path"
cd "$path"

# --- pnpm and dependencies -----------------------------------------------------
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
if command -v pnpm >/dev/null; then pnpm=(pnpm)
elif command -v corepack >/dev/null; then pnpm=(corepack pnpm)
else pnpm=(npx --yes "pnpm@$PNPM_VERSION"); fi

if [[ ! -f node_modules/.modules.yaml || pnpm-lock.yaml -nt node_modules/.modules.yaml ]]; then
  step 'Installing dependencies (first run takes a minute)'
  "${pnpm[@]}" install --frozen-lockfile || stop 'Installing dependencies failed.' 'Scroll up for the error from pnpm.'
fi
done_ 'Dependencies ready'

# --- Start ---------------------------------------------------------------------
# A ready-made Pro account, on this computer's own database only (the
# server refuses it with a public address or live Stripe keys).
if [[ $dev_account -eq 1 ]]; then
  export GYMGO_DEV_PRO=on
  printf '\n  Pro account for trying GymGO on this Mac: dev@gymgo.test / GymGO-dev-pro-2026\n'
fi
printf '\n'
exec node scripts/dev.mjs "${pass[@]+"${pass[@]}"}"
