# syntax=docker/dockerfile:1.7
#
# GymGO online: the server, and Caddy serving the web version of the app in
# front of it, with HTTPS. Built by deploy/docker-compose.yml from the whole
# repository (see README, "Put GymGO online").
#
#   app    the GymGO server (apps/server), run as a normal user, its data in /data
#   proxy  Caddy, with the web app built for GYMGO_PUBLIC_URL

ARG NODE_IMAGE=node:22-bookworm-slim

# --- pnpm, and every package the lockfile names, fetched once -------------------
FROM ${NODE_IMAGE} AS pnpm
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# On a network that inspects HTTPS (some offices do), pass its certificate as
# a build secret named extra_ca (README says how); without one, nothing changes.
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
# The lockfile alone decides what's fetched, so this step is only redone when it changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    pnpm fetch

# --- The web app: the phone app's own code, exported as a website ---------------
FROM pnpm AS web
ARG GYMGO_PUBLIC_URL
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile --filter "@gymgo/mobile..."
# It talks to the server at its public address, the same site it's served from.
RUN test -n "$GYMGO_PUBLIC_URL" || (echo "GYMGO_PUBLIC_URL is needed to build the web app (deploy/.env)" && exit 1)
RUN cd apps/mobile && EXPO_PUBLIC_API_URL="$GYMGO_PUBLIC_URL" npx expo export --platform web --output-dir /web

# --- The server, with its own packages and nothing else (about 45 MB) ----------
FROM pnpm AS server
COPY . .
# Workspace packages are copied in rather than linked (for this command
# only), so /out stands on its own, from the lockfile, with no network.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --config.inject-workspace-packages=true --filter @gymgo/server deploy --prod --offline /out

# --- What runs: the server ---------------------------------------------------------
FROM ${NODE_IMAGE} AS app
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    GYMGO_DB=/data/gymgo.db \
    GYMGO_PHOTOS=/data/photos \
    GYMGO_BACKUP_DIR=/data/backups
WORKDIR /app
COPY --from=server --chown=node:node /out ./
RUN mkdir -p /data && chown node:node /data
# Not root: a break-in to the server process can't take over the machine as easily.
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--no-warnings=ExperimentalWarning", "--import", "tsx", "src/main.ts"]

# --- What answers the internet: Caddy, with the web app ----------------------------
FROM caddy:2-alpine AS proxy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web /web /srv/web
