#!/usr/bin/env bash
# Cloud Agent install: idempotent repository bootstrap.
# Installs the PostgreSQL server (durable system dependency for Payload CMS)
# and project dependencies. Safe to re-run.
set -euo pipefail

echo "==> Installing PostgreSQL server (if missing)"
if ! command -v /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1 && ! command -v initdb >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    postgresql postgresql-contrib
fi

echo "==> Installing JS dependencies with pnpm"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

# sharp/esbuild/unrs-resolver ship native binaries via optional deps but pnpm 10
# blocks their build scripts by default. Approve and rebuild them so image
# processing (Payload/Next) and bundling work deterministically.
echo "==> Ensuring native build scripts ran (sharp, esbuild, unrs-resolver)"
pnpm rebuild sharp esbuild unrs-resolver >/dev/null 2>&1 || true

echo "==> install.sh complete"
