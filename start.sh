#!/bin/sh
# Construct Nakama database connection URL from individual Render env vars
ADAPTER_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "$ADAPTER_URL"

echo "Starting Nakama with transformed Database URL..."

exec /nakama/nakama run \
  --config /nakama/data/nakama-config.yml \
  --database.address "$ADAPTER_URL" \
  --session.token_expiry_sec 7200
