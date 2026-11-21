#!/usr/bin/env bash
# Run on a web export (apps/mobile/dist) before it's published, by
# netlify-build.sh and pages-build.sh.
#
# Netlify leaves out any folder named node_modules, or starting with a dot,
# when it publishes a site, and GitHub Pages' upload leaves out the dotted
# ones; pnpm keeps the fonts and icons' files under both
# (assets/__node_modules/.pnpm/<package>/node_modules/...). Without this, the
# website has no icons and the wrong typeface. Rename the folders, then the
# paths to them in the app's code (wherever the site is served from, so
# "/GymGO/assets/..." as well as "/assets/...").
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

DIST="${1:?Usage: web-assets.sh <export dir>}"
find "$DIST/assets" -depth -type d \( -name node_modules -o -name '.*' \) -print0 |
  while IFS= read -r -d '' dir; do
    base="$(basename "$dir")"
    if [ "$base" = node_modules ]; then new=_nm; else new="_${base#.}"; fi
    mv "$dir" "$(dirname "$dir")/$new"
  done
perl -pi -e 's{"[^"\s]*/assets/__node_modules/[^"]*"}{ (my $p = $&) =~ s{/node_modules/}{/_nm/}g; $p =~ s{/\.}{/_}g; $p }ge' "$DIST"/_expo/static/js/web/*.js
if find "$DIST/assets" -path '*/node_modules/*' -o -path '*/.*' | grep -q .; then
  echo "Some files are still under a folder the hosts leave out." >&2
  exit 1
fi
