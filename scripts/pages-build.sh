#!/usr/bin/env bash
# GymGO's website on GitHub Pages (.github/workflows/pages.yml runs this):
# the limited version, the app exported for the browser with no GymGO server
# behind it and the gyms built into the app (apps/mobile/src/lib/limited.ts),
# as netlify-build.sh makes it for Netlify. Run after pnpm install.
#
#   BASE_PATH  where Pages serves the site: "/GymGO" on
#              ashenkodituwakku.github.io, "" once a custom domain is set.
#   SITE_URL   the site's full address, for the picture a shared link shows.
#
# Writes apps/mobile/dist.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

BASE="${BASE_PATH:-}"
BASE="${BASE%/}"
ADDRESS="${SITE_URL:-}"
ADDRESS="${ADDRESS%/}"

cd "$(dirname "$0")/../apps/mobile"
rm -rf dist
GYMGO_BASE_URL="$BASE" EXPO_PUBLIC_API_URL=none EXPO_PUBLIC_LIMITED=on EXPO_PUBLIC_ACCOUNT=optional \
  npx expo export --platform web --output-dir dist

bash ../../scripts/web-assets.sh dist

# The page's own links (the manifest, the home-screen icon, the share
# picture) and the manifest's paths are written from the site's root; under
# /GymGO they need it in front. Expo's own (its scripts, styles and the
# favicon) already have it, so those are left as they are.
if [ -n "$BASE" ]; then
  BASE="$BASE" perl -pi -e 'my $b = substr($ENV{BASE}, 1); s{(href|content)="/(?!/|\Q$b\E/)}{$1="$ENV{BASE}/}g' dist/index.html
  BASE="$BASE" perl -pi -e 's{"(start_url|scope|src)": "/}{"$1": "$ENV{BASE}/}g' dist/manifest.webmanifest
fi
# A shared link's picture needs its full address.
if [ -n "$ADDRESS" ]; then
  ADDRESS="$ADDRESS" BASE="$BASE" perl -pi -e 's{content="\Q$ENV{BASE}\E/og\.png"}{content="$ENV{ADDRESS}/og.png"}g' dist/index.html
fi

# Pages has no rewrites: any other path (a gym's page opened from a link)
# gets 404.html, so that's the app too, which then shows the right screen.
cp dist/index.html dist/404.html
# Serve the files as they are, without Jekyll.
touch dist/.nojekyll

echo "Built for GitHub Pages: base '${BASE:-/}', address ${ADDRESS:-unknown}"
