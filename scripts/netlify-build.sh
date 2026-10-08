#!/usr/bin/env bash
# GymGO's website on Netlify (netlify.toml runs this). The website is the
# phone app's own code exported for the browser. The GymGO server runs
# somewhere else, and Netlify passes its addresses on to it, as Caddy does in
# deploy/Caddyfile, so the site and its server share one address and the
# browser never makes a cross-site request.
#
# Set in Netlify (Project configuration > Environment variables):
#   GYMGO_SERVER_URL  where the GymGO server answers, e.g. https://api.example.com
#                     (started with GYMGO_PUBLIC_URL set to this site's address).
#                     Without it the site works on its own: the gyms built into
#                     the app, and no signing in, reviews, photos or Pro.
# netlify.toml sets EXPO_PUBLIC_ACCOUNT=optional: the website can be used
# without an account (lib/accountRule.ts).
# Started with sh (a build command typed into Netlify's settings, say): run again in bash.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

# With a server, the app sends its requests to the address it's served from:
# the site's own domain in production, or a preview's own address. Without
# one it asks nothing of a server ("none", lib/serverAddress.ts).
if [ -z "${GYMGO_SERVER_URL:-}" ]; then
  SITE="none"
elif [ "${CONTEXT:-production}" = "production" ]; then
  SITE="${URL:?Netlify sets URL}"
else
  SITE="${DEPLOY_PRIME_URL:-${URL:?Netlify sets URL}}"
fi

pnpm install --frozen-lockfile --filter "@gymgo/mobile..."
cd apps/mobile
rm -rf dist
EXPO_PUBLIC_API_URL="$SITE" npx expo export --platform web --output-dir dist

# Netlify leaves out any folder named node_modules, or starting with a dot,
# when it publishes a site, and pnpm keeps the fonts and icons' files under
# both (assets/__node_modules/.pnpm/<package>/node_modules/...). Without
# this, the website has no icons and the wrong typeface. Rename the folders,
# then the paths to them in the app's code.
find dist/assets -depth -type d \( -name node_modules -o -name '.*' \) -print0 |
  while IFS= read -r -d '' dir; do
    base="$(basename "$dir")"
    if [ "$base" = node_modules ]; then new=_nm; else new="_${base#.}"; fi
    mv "$dir" "$(dirname "$dir")/$new"
  done
perl -pi -e 's{"/assets/__node_modules/[^"]*"}{ (my $p = $&) =~ s{/node_modules/}{/_nm/}g; $p =~ s{/\.}{/_}g; $p }ge' dist/_expo/static/js/web/*.js
if find dist/assets -path '*/node_modules/*' -o -path '*/.*' | grep -q .; then
  echo "Some files are still under a folder Netlify leaves out." >&2
  exit 1
fi

# The site's own address, now that it's known: the preview a shared link
# shows needs its picture's full address, and robots.txt points search
# engines to the sitemap (the sitemap plugin in netlify.toml writes it).
# apps/mobile/public leaves both without one, as it ships with every build.
if [ "${CONTEXT:-production}" = "production" ]; then
  ADDRESS="${URL:-}"
else
  ADDRESS="${DEPLOY_PRIME_URL:-${URL:-}}"
fi
if [ -n "$ADDRESS" ]; then
  ADDRESS="${ADDRESS%/}" perl -pi -e 's{content="/og\.png"}{content="$ENV{ADDRESS}/og.png"}g' dist/index.html
  printf 'Sitemap: %s/sitemap.xml\n' "${ADDRESS%/}" >> dist/robots.txt
fi

# Routing: the server's own paths go to the server; any other path is a
# screen of the app, which is always index.html.
{
  if [ -n "${GYMGO_SERVER_URL:-}" ]; then
    server="${GYMGO_SERVER_URL%/}"
    echo "/api/*  ${server}/api/:splat  200!"
    for path in /terms /privacy /refunds /community /legal /reset-password /.well-known/security.txt; do
      echo "${path}  ${server}${path}  200!"
    done
  else
    echo "GYMGO_SERVER_URL isn't set: the website goes up on its own, with no server." >&2
  fi
  echo "/*  /index.html  200"
} > dist/_redirects

echo "Built: server ${GYMGO_SERVER_URL:-none}, account ${EXPO_PUBLIC_ACCOUNT:-required}"
