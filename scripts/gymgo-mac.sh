#!/usr/bin/env bash
# Start GymGO on a Mac, from any state: no copy yet, an old copy, or the
# wrong branch. It brings ~/GymGO up to date first, then runs.
#
# One line, from anywhere (downloads this script and runs it):
#   curl -fsSL https://raw.githubusercontent.com/ashenkodituwakku/GymGO/claude/friendly-johnson-9rzxrj/scripts/gymgo-mac.sh | bash -s -- --xcode
#
# Or, once you have it:
#   bash ~/GymGO/scripts/gymgo-mac.sh            server + app in your browser, QR code for Expo Go
#   bash ~/GymGO/scripts/gymgo-mac.sh --xcode    server + open GymGO in Xcode (Simulator or your iPhone)
#
# Options:
#   --xcode            make the Xcode project and open it
#   --team ABCDE12345  (with --xcode) sign with this Apple team, so Xcode doesn't ask
#   --clean            (with --xcode) make the Xcode project again from scratch
#   --no-update        don't fetch the latest GymGO first
#   --no-auto-update   don't keep fetching it while running (every 3 minutes by default)
#   --tunnel           (Expo Go) for a phone on a different network
#   --no-browser       (Expo Go) don't open a browser window
#   --no-dev-account   leave out the ready-made Pro account (dev@gymgo.test)
#   --doctor           print what's installed and where things stand, for troubleshooting
#   --path DIR         where GymGO lives (default ~/GymGO)
#
# Everything it installs is free, and it never signs you up for anything.
# Ctrl+C stops it all.

set -euo pipefail

REPO_URL="${GYMGO_REPO_URL:-https://github.com/ashenkodituwakku/GymGO.git}"
BRANCH='claude/friendly-johnson-9rzxrj'
MIN_NODE='22.13.0'
PNPM_VERSION='10.33.0'

# CocoaPods fails in a shell without a UTF-8 locale ("Unicode Normalization not appropriate for ASCII-8BIT").
if [[ "$(uname)" == Darwin ]]; then
  export LANG="${LANG:-en_US.UTF-8}"
  export LC_ALL="${LC_ALL:-en_US.UTF-8}"
fi

original_args=("$@")
path="$HOME/GymGO"
update=1
auto_update=1
dev_account=1
doctor=0
pass=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-update) update=0 ;;
    --update) update=1 ;;
    --no-auto-update) auto_update=0 ;;
    --no-dev-account) dev_account=0 ;;
    --doctor) doctor=1 ;;
    --path) path="$2"; shift ;;
    --team) pass+=("--team" "$2"); shift ;;
    --xcode | --clean | --tunnel | --no-browser) pass+=("$1") ;;
    -h | --help) sed -n '2,27p' "${BASH_SOURCE[0]:-$0}" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '  \033[36m>\033[0m  %s\n' "$1"; }
done_() { printf '  \033[32mOK\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m  %s\n' "$1"; }
stop() { printf '\n  \033[31mX\033[0m  %s\n     %s\n\n' "$1" "$2" >&2; exit 1; }

if [[ -z "${GYMGO_MAC_RUNNING:-}" ]]; then printf '\n  GymGO\n\n'; fi

if [[ $doctor -eq 1 ]]; then
  echo "  macOS:         $(sw_vers -productVersion 2>/dev/null || uname -sr)"
  echo "  Chip:          $(uname -m)"
  echo "  Xcode:         $(xcodebuild -version 2>/dev/null | head -1 || echo 'not found')"
  echo "  xcode-select:  $(xcode-select -p 2>/dev/null || echo 'not set')"
  echo "  CocoaPods:     $(pod --version 2>/dev/null || echo 'not found')"
  echo "  Node:          $(node --version 2>/dev/null || echo 'not found') at $(command -v node || echo '-')"
  echo "  Git:           $(git --version 2>/dev/null || echo 'not found')"
  echo "  Homebrew:      $(brew --version 2>/dev/null | head -1 || echo 'not found')"
  echo "  Locale:        LANG=$LANG"
  if [[ -d "$path/.git" ]]; then
    echo "  GymGO:         $path, branch $(git -C "$path" rev-parse --abbrev-ref HEAD), $(git -C "$path" log -1 --format='%h %cr: %s')"
    echo "  Local edits:   $(git -C "$path" status --porcelain | wc -l | tr -d ' ') file(s)"
    if [[ -f "$path/apps/mobile/ios/.gymgo-prebuild.json" ]]; then
      echo "  Xcode project: made, $(tr -d '\n ' < "$path/apps/mobile/ios/.gymgo-prebuild.json")"
    else
      echo "  Xcode project: not made yet"
    fi
    if [[ -f "$path/apps/mobile/ios/.xcode.env.local" ]]; then grep -v '^#' "$path/apps/mobile/ios/.xcode.env.local" | sed 's/^/  xcode.env:     /'; fi
  else
    echo "  GymGO:         no copy at $path yet"
  fi
  echo "  Wi-Fi address: $(ipconfig getifaddr en0 2>/dev/null || echo 'none on en0')"
  echo "  Port 4000:     $(lsof -nP -iTCP:4000 -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1" (pid "$2")"}' || true)"
  echo "  Port 8081:     $(lsof -nP -iTCP:8081 -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1" (pid "$2")"}' || true)"
  printf '\n  Paste this into the chat if something isn'"'"'t working.\n\n'
  exit 0
fi

# --- Node --------------------------------------------------------------------
command -v node >/dev/null || stop 'Node.js is not installed.' 'Install it with Homebrew (https://brew.sh): brew install node'
node_version="$(node --version | sed 's/^v//')"
# Compared in Node itself: the sort that comes with older macOS can't order versions.
if ! node -e 'const [a, b] = process.argv.slice(1).map((v) => v.split(".").map(Number)); process.exit((a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) >= 0 ? 0 : 1)' "$node_version" "$MIN_NODE"; then
  stop "Node.js $node_version is too old; GymGO needs $MIN_NODE or newer." 'Update it: brew upgrade node'
fi
command -v git >/dev/null || stop 'Git is not installed.' 'Run: xcode-select --install   (Apple’s free command line tools include Git)'

# --- The copy of GymGO: made, or brought up to date --------------------------
if [[ -z "${GYMGO_MAC_RUNNING:-}" ]]; then
  done_ "Node.js $node_version"
  if [[ ! -e "$path" ]]; then
    step "Downloading GymGO into $path"
    git clone --branch "$BRANCH" "$REPO_URL" "$path" || stop 'The download failed.' 'Check your internet connection, then run this again.'
  elif [[ ! -d "$path/.git" ]]; then
    stop "$path exists but isn't a copy of GymGO." "Move it aside (mv \"$path\" \"$path.old\") and run this again, or pass --path somewhere else."
  elif [[ $update -eq 1 ]]; then
    step 'Fetching the latest GymGO'
    git -C "$path" fetch --quiet origin "$BRANCH" || stop 'Couldn’t reach GitHub to update.' 'Check your internet connection, or run with --no-update to use the copy you have.'
    if [[ -n "$(git -C "$path" status --porcelain)" ]]; then
      # Set aside, not thrown away: `git -C ~/GymGO stash pop` brings them back.
      git -C "$path" stash push --include-untracked --quiet -m "gymgo-mac.sh set these aside on $(date '+%Y-%m-%d %H:%M')"
      warn "Local edits in $path were set aside (git stash). Get them back with: git -C \"$path\" stash pop"
    fi
    if [[ "$(git -C "$path" rev-parse --abbrev-ref HEAD)" != "$BRANCH" ]]; then
      git -C "$path" checkout --quiet "$BRANCH" 2>/dev/null || git -C "$path" checkout --quiet -b "$BRANCH" --track "origin/$BRANCH"
    fi
    if ! git -C "$path" merge --ff-only --quiet "origin/$BRANCH"; then
      stop 'Your copy has commits GitHub doesn’t, so it can’t simply move forward.' "Start fresh: mv \"$path\" \"$path.old\" and run this again."
    fi
  fi
  done_ "GymGO at $(git -C "$path" log -1 --format='%h, %cr: %s')"

  # Carry on with the newest version of this script, from the copy just
  # updated, so a fix to the script itself takes effect straight away.
  export GYMGO_MAC_RUNNING=1
  next=("$path/scripts/gymgo-mac.sh" --no-update --path "$path" ${original_args[@]+"${original_args[@]}"})
  if [[ ! -t 0 ]] && (exec < /dev/tty) 2>/dev/null; then
    # Run from `curl | bash`: give it the keyboard back.
    exec bash "${next[@]}" < /dev/tty
  fi
  exec bash "${next[@]}"
fi
cd "$path"

# --- pnpm and dependencies -----------------------------------------------------
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
if command -v pnpm >/dev/null; then pnpm=(pnpm)
elif command -v corepack >/dev/null; then pnpm=(corepack pnpm)
else pnpm=(npx --yes "pnpm@$PNPM_VERSION"); fi
# For dev.mjs, which reinstalls when an update brings new dependencies.
export GYMGO_PNPM="${pnpm[*]}"

if [[ ! -f node_modules/.modules.yaml || pnpm-lock.yaml -nt node_modules/.modules.yaml ]]; then
  step 'Installing dependencies (the first time takes a minute or two)'
  "${pnpm[@]}" install --frozen-lockfile || stop 'Installing dependencies failed.' 'Scroll up for the error from pnpm, or run with --doctor and share what it prints.'
fi
done_ 'Dependencies ready'

# --- Start ---------------------------------------------------------------------
# A ready-made Pro account, on this computer's own database only (the
# server refuses it with a public address or live Stripe keys).
if [[ $dev_account -eq 1 ]]; then
  export GYMGO_DEV_PRO=on
  printf '\n  Pro account for trying GymGO on this Mac: dev@gymgo.test / GymGO-dev-pro-2026\n'
fi
if [[ $auto_update -eq 1 ]]; then pass+=("--auto-update"); fi
export GYMGO_BRANCH="$BRANCH"
printf '\n'
exec node scripts/dev.mjs ${pass[@]+"${pass[@]}"}
