#!/bin/sh
# Applies migrations, optionally seeds reviewer data, then starts the API.
set -e

node dist/database/migrate.js

if [ "${SEED_ON_START:-true}" = "true" ]; then
  # Idempotent: safe on every start.
  node dist/database/seed/seed.js
fi

exec node dist/main.js
