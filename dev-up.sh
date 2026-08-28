#!/usr/bin/env bash
# Start the local services and Keyword Pro development server.
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and fill in the required values."
  exit 1
fi

if command -v podman >/dev/null 2>&1; then
  compose=(podman compose)
elif command -v docker >/dev/null 2>&1; then
  compose=(docker compose)
else
  echo "Podman or Docker is required to start PostgreSQL and Redis."
  exit 1
fi

if ! pnpm --ignore-workspace validate:runtime; then
  exit 1
fi

"${compose[@]}" -f compose.yml up -d

keyword_pro_port="${KEYWORD_PRO_PORT:-3002}"
keyword_pro_host="127.0.0.1"
echo "Postgres :5434   Redis :6381   App http://localhost:${keyword_pro_port}/keyword-pro"
exec pnpm --ignore-workspace exec next dev --turbo --hostname "${keyword_pro_host}" --port "${keyword_pro_port}"
