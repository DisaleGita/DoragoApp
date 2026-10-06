#!/bin/sh
# Container entrypoint. Compose runs migrations in its own one-shot service;
# single-container hosts (e.g. Render's free tier) opt in to running them here.
set -eu

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
    alembic upgrade head
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" \
    --proxy-headers --forwarded-allow-ips='*'
