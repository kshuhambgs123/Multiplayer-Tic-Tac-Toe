#!/bin/sh
# Robust DSN resolution
if [ -n "$NAKAMA_DATABASE_URL" ]; then
  ADAPTER_URL=$(echo "$NAKAMA_DATABASE_URL" | sed 's/^postgresql/postgres/')
else
  ADAPTER_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "DEBUG: Constructed ADAPTER_URL (masked): $(echo $ADAPTER_URL | sed 's/:[^@]*@/:****@/')"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$ADAPTER_URL"

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/nakama-config.yml --database.address "$ADAPTER_URL" --session.token_expiry_sec 7200
