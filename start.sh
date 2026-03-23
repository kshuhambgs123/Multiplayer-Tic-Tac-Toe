#!/bin/sh
# Smart environment detection
if [ -n "$RENDER" ]; then
  echo "Env: Render. Using hardcoded connectivity..."
  ADAPTER_URL="postgres://nakama_zvif_user:ADvO78GBduObDM1QQ7s5nhJGHcwXdA7M@dpg-d6vr9gshg0os739ve98g-a/nakama_zvif"
else
  echo "Env: Local. Using localhost fallback..."
  ADAPTER_URL="postgres://root@localhost:26257/nakama"
fi

echo "database:" > /nakama/data/runtime-config.yml
echo "  address: \"$ADAPTER_URL\"" >> /nakama/data/runtime-config.yml
cat /nakama/data/nakama-config.yml >> /nakama/data/runtime-config.yml

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$ADAPTER_URL"

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/runtime-config.yml --database.address "$ADAPTER_URL" --session.token_expiry_sec 7200
