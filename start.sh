#!/bin/sh
# Atomic startup driven by Environment Variables
if [ -n "$NAKAMA_DATABASE_ADDRESS" ]; then
  # The environment variable comes as postgresql:// but Nakama expects postgres://
  DB_ADDR=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')
else
  # Local Fallback
  DB_ADDR="postgres://root@localhost:26257/nakama"
fi

echo "Running migrations with DB: $DB_ADDR"
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama [Atomic Mode]..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml --database.address "$DB_ADDR"
