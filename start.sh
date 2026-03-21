#!/bin/sh
# Start Nakama and dynamically pass the DATABASE_URL provided by Render
exec /nakama/nakama run \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DATABASE_URL" \
  --session.token_expiry_sec 7200
