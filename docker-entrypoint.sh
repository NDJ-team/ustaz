#!/bin/sh
set -eu

# On a fresh container (or after a Render redeploy) the SQLite file is absent.
# Seed the demo data once, then keep it for subsequent starts inside this container.
if [ ! -f /app/server/data/ustaz.db ]; then
  echo "[startup] demo database not found, seeding..."
  node /app/server/dist/seed.js
fi

exec node /app/server/dist/index.js
