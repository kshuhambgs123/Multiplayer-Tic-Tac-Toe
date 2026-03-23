#!/bin/sh
# Generate a runtime config that Nakama is forced to see
CORRECTED_URL=$(echo "$NAKAMA_DATABASE_ADDRESS" | sed 's/^postgresql/postgres/')

echo "database:" > /nakama/data/runtime-config.yml
echo "  address: \"$CORRECTED_URL\"" >> /nakama/data/runtime-config.yml
cat /nakama/data/nakama-config.yml >> /nakama/data/runtime-config.yml

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$CORRECTED_URL"

echo "Starting server with dynamic config..."
exec /nakama/nakama run --config /nakama/data/runtime-config.yml --session.token_expiry_sec 7200
