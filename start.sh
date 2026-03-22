#!/bin/sh
# Use environment variables for better reliability
ADAPTER_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

export NAKAMA_DATABASE_ADDRESS="$ADAPTER_URL"

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/nakama-config.yml --session.token_expiry_sec 7200
