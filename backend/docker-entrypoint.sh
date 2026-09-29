#!/bin/sh
# Applies migrations, optionally seeds reviewer data, then starts the API.
set -e

if [ -z "${JWT_SECRET}" ]; then
  # No secret configured: generate a random one for this container run rather
  # than shipping a default. Set JWT_SECRET to keep sessions across restarts.
  JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))")"
  export JWT_SECRET
  echo "JWT_SECRET not set: generated a random secret for this run."
fi

node dist/database/migrate.js

if [ "${SEED_ON_START:-true}" = "true" ]; then
  # Idempotent: safe on every start.
  node dist/database/seed/seed.js
fi

exec node dist/main.js
