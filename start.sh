#!/bin/sh
# Fix protocol if it exists (Render uses postgresql://, Nakama needs postgres://)
if [ -n "$NAKAMA_DATABASE_ADDRESS" ]; then
  export NAKAMA_DATABASE_ADDRESS=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')
fi

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/nakama-config.yml --session.token_expiry_sec 7200
