#!/bin/sh
# Diagnostic: Log which variables are available (values are truncated/masked for security)
echo "Checking Render DB variables..."
echo "DB_HOST: ${DB_HOST:0:8}..."
echo "DB_USER: ${DB_USER:0:4}..."
echo "DB_NAME: ${DB_NAME}"

# Construct Nakama database connection URL from individual Render env vars
if [ -z "$DB_HOST" ]; then
  echo "CRITICAL: DB_HOST is empty! Falling back to NAKAMA_DATABASE_URL if available..."
  ADAPTER_URL=$(echo "$NAKAMA_DATABASE_URL" | sed 's/^postgresql/postgres/')
else
  ADAPTER_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "$ADAPTER_URL"

echo "Starting Nakama with transformed Database URL..."

exec /nakama/nakama run \
  --config /nakama/data/nakama-config.yml \
  --database.address "$ADAPTER_URL" \
  --session.token_expiry_sec 7200
