#!/bin/bash

# Arena Unified: Elite One-Click Cleanup & Start
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Docker.app/Contents/Resources/bin

echo "--- ARENA DEEP CLEANUP ---"

# 1. CLEANUP LOCAL PORTS (3001 & 5173)
# This prevents "Address already in use" errors if a previous process didn't close.
echo "Cleaning up local ports..."
lsof -ti:3001 | xargs kill -9 >/dev/null 2>&1
lsof -ti:5173 | xargs kill -9 >/dev/null 2>&1

# 2. FORCE REMOVE EXISTING DOCKER & DATA
echo "Purging existing containers and wiping test data..."
if docker compose version >/dev/null 2>&1; then
    docker compose down -v --remove-orphans
elif docker-compose version >/dev/null 2>&1; then
    docker-compose down -v --remove-orphans
fi

# 3. Building Backend Logic
echo "Compiling Authoritative Match Handler..."
cd backend && npm run build
cd ..

# 4. Fresh Infrastructure Start
echo "Starting brand-new PostgreSQL and Nakama (Pure State)..."
if docker compose version >/dev/null 2>&1; then
    docker compose up -d
elif docker-compose version >/dev/null 2>&1; then
    docker-compose up -d
else
    # Final check for standard Mac path
    if [ -f "/usr/local/bin/docker" ]; then
        /usr/local/bin/docker compose up -d
    else
        echo "Error: Docker not detected! You must have Docker Desktop running first."
        exit 1
    fi
fi

# 5. Wait for Deep Initialization
echo "Waiting 10 seconds for deep database initialization..."
sleep 10

# 6. Integrated Launch
echo "Launching Frontend and Analytics Hub..."
npx concurrently \
  -n "FRONTEND,ANALYTICS" \
  -c "blue,yellow" \
  "cd frontend && npm run dev" \
  "cd express-api && npm run dev"
