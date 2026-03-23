#!/bin/sh
# Triple-layered DSN resolution
if [ -n "$DB_HOST" ]; then
  echo "Source: Individual vars"
  CORRECTED_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
elif [ -n "$NAKAMA_DATABASE_ADDRESS" ]; then
  echo "Source: NAKAMA_DATABASE_ADDRESS"
  CORRECTED_URL=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')
else
  echo "Source: HARDCODED FALLBACK"
  CORRECTED_URL="postgres://nakama_zvif_user:ADvO78GBduObDM1QQ7s5nhJGHcwXdA7M@dpg-d6vr9gshg0os739ve98g-a/nakama_zvif"
fi

echo "database:" > /nakama/data/runtime-config.yml
echo "  address: \"$CORRECTED_URL\"" >> /nakama/data/runtime-config.yml
cat /nakama/data/nakama-config.yml >> /nakama/data/runtime-config.yml

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$CORRECTED_URL"

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/runtime-config.yml --session.token_expiry_sec 7200
