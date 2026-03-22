#!/bin/sh
# Start Nakama and dynamically pass the DATABASE_URL provided by Render
# Fix potential postgresql:// vs postgres:// protocol issue
ADAPTER_URL=$(echo "$NAKAMA_DATABASE_URL" | sed 's/^postgresql/postgres/')

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "$ADAPTER_URL"

echo "Starting Nakama with transformed Database URL..."

exec /nakama/nakama run \
  --config /nakama/data/nakama-config.yml \
  --database.address "$ADAPTER_URL" \
  --session.token_expiry_sec 7200
