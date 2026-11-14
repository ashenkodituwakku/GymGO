#!/usr/bin/env bash
# GymGO's website on GitHub Pages (.github/workflows/pages.yml runs this):
# the app exported for the browser, as one website with two versions. As a
# page opens it asks its GymGO server (GymGO online from the owner's
# computer, scripts/online.mjs) whether it's on: the full GymGO if it
# answers, the limited version if not, with the gyms built into the app
# (apps/mobile/src/lib/website.ts, limited.ts). Accounts are optional, as on
# Netlify: anyone can look around, and sign in for what the server keeps.
# Run after pnpm install.
#
#   BASE_PATH   where Pages serves the site: "/GymGO" on
#               ashenkodituwakku.github.io, "" once a custom domain is set.
#   SITE_URL    the site's full address, for the picture a shared link shows.
#   SERVER_URL  the server's fixed https address, https://app.gymgo.site
#               unless set (the repository variable GYMGO_SERVER_URL);
#               "none" for the limited version only, asking nothing.
#
# Writes apps/mobile/dist.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

BASE="${BASE_PATH:-}"
BASE="${BASE%/}"
ADDRESS="${SITE_URL:-}"
ADDRESS="${ADDRESS%/}"
SERVER="${SERVER_URL:-https://app.gymgo.site}"
SERVER="${SERVER%/}"
if [ "$SERVER" = "none" ]; then
  LIMIT=on
else
  # Only an https address (or http on this computer, to try a build out), with nothing in it that
  # could break out of the page's script.
  if ! [[ "$SERVER" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ || "$SERVER" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$ ]]; then
    echo "SERVER_URL must be an https address such as https://app.gymgo.site, or none: got '$SERVER'" >&2
    exit 1
  fi
  LIMIT=auto
fi

cd "$(dirname "$0")/../apps/mobile"
rm -rf dist
# --clear: a build writes these settings into each file, and the bundler's cache doesn't notice when
# only a setting changes, so a file left as it was could keep another build's (online.mjs's, say).
GYMGO_BASE_URL="$BASE" EXPO_PUBLIC_API_URL="$SERVER" EXPO_PUBLIC_LIMITED="$LIMIT" EXPO_PUBLIC_ACCOUNT=optional \
  npx expo export --platform web --output-dir dist --clear

bash ../../scripts/web-assets.sh dist

# The page's own links (the manifest, the home-screen icon, the share
# picture, the loading screen's picture) and the manifest's paths are written
# from the site's root; under /GymGO they need it in front. Expo's own (its
# scripts, styles and the favicon) already have it, so those are left as they are.
if [ -n "$BASE" ]; then
  BASE="$BASE" perl -pi -e 'my $b = substr($ENV{BASE}, 1); s{(href|content|src)="/(?!/|\Q$b\E/)}{$1="$ENV{BASE}/}g' dist/index.html
  BASE="$BASE" perl -pi -e 's{"(start_url|scope|src)": "/}{"$1": "$ENV{BASE}/}g' dist/manifest.webmanifest
fi
# A shared link's picture needs its full address.
if [ -n "$ADDRESS" ]; then
  ADDRESS="$ADDRESS" BASE="$BASE" perl -pi -e 's{content="\Q$ENV{BASE}\E/og\.png"}{content="$ENV{ADDRESS}/og.png"}g' dist/index.html
fi

# The question to the server, asked by the page as it opens, while the app's
# code is still downloading, so its answer is ready when the app starts
# (website.ts reads it as __gymgoServer). Without it the app asks itself.
if [ "$LIMIT" = "auto" ]; then
  SERVER="$SERVER" perl -0pi -e 's{</head>}{<script>window.__gymgoServer=fetch("$ENV{SERVER}/api/health",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(b){return !!b&&b.ok===true},function(){return false})</script>\n  </head>}' dist/index.html
  grep -q '__gymgoServer' dist/index.html || { echo "Couldn't add the server question to index.html" >&2; exit 1; }
fi

# Pages has no rewrites: any other path (a gym's page opened from a link)
# gets 404.html, so that's the app too, which then shows the right screen.
cp dist/index.html dist/404.html
# Serve the files as they are, without Jekyll.
touch dist/.nojekyll

if [ "$LIMIT" = "auto" ]; then
  echo "Built for GitHub Pages: base '${BASE:-/}', address ${ADDRESS:-unknown}; the full version while $SERVER answers, the limited one when it doesn't"
else
  echo "Built for GitHub Pages: base '${BASE:-/}', address ${ADDRESS:-unknown}; the limited version only"
fi
