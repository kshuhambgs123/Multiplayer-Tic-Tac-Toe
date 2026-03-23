#!/bin/sh
# NUCLEAR OPTION: Hardcoded verified URL
# We use the internal URL provided by the user to guarantee connectivity
CORRECTED_URL="postgres://nakama_zvif_user:ADvO78GBduObDM1QQ7s5nhJGHcwXdA7M@dpg-d6vr9gshg0os739ve98g-a/nakama_zvif"

echo "DEBUG: ENV CHECK (NAKAMA_DATABASE_ADDRESS is set: ${NAKAMA_DATABASE_ADDRESS:+yes})"
echo "USING HARDCODED DSN..."

# Ensure environment variable is also set for server sub-processes
export NAKAMA_DATABASE_ADDRESS="$CORRECTED_URL"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$CORRECTED_URL"

echo "Starting server..."
exec /nakama/nakama run --config /nakama/data/nakama-config.yml --database.address "$CORRECTED_URL" --session.token_expiry_sec 7200
