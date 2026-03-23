#!/bin/sh
# Atomic startup driven by Environment Variables
if [ -n "$NAKAMA_DATABASE_ADDRESS" ]; then
  # The environment variable comes as postgresql:// but Nakama expects postgres://
  DB_ADDR=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')
else
  # Fallback directly to the Render internal DB
  DB_ADDR="postgres://nakama_zvif_user:ADvO78GBduObDM1QQ7s5nhJGHcwXdA7M@dpg-d6vr9gshg0os739ve98g-a/nakama_zvif"
fi
 
echo "Running migrations with DB: $DB_ADDR"
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama [Atomic Mode]..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml --database.address "$DB_ADDR"
