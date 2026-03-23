#!/bin/sh
# Atomic startup driven by Environment Variables
if [ -n "$NAKAMA_DATABASE_ADDRESS" ]; then
  export NAKAMA_DATABASE_ADDRESS=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')
fi

# Local Fallback
if [ -z "$RENDER" ] && [ -z "$NAKAMA_DATABASE_ADDRESS" ]; then
  export NAKAMA_DATABASE_ADDRESS="postgres://root@localhost:26257/nakama"
fi

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting Nakama [Atomic Mode]..."
exec /nakama/nakama run
