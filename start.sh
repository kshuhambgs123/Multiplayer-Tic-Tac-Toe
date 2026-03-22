#!/bin/sh
# Minimal start script to avoid shell parsing issues
ADAPTER_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

/nakama/nakama migrate up --database.address "$ADAPTER_URL"
exec /nakama/nakama run --config /nakama/data/nakama-config.yml --database.address "$ADAPTER_URL" --session.token_expiry_sec 7200
