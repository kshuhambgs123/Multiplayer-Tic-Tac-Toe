FROM node:18-alpine AS builder

WORKDIR /backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.16.0

# Copy the custom game logic into the Nakama runtime module directory
COPY --from=builder /backend/build/*.js /nakama/data/modules/build/
COPY infrastructure/nakama-config.yml /nakama/data/

# Start wrapper
COPY start.sh /nakama/
RUN chmod +x /nakama/start.sh

# Override the entrypoint to run the shell script instead of defaulting to Nakama directly
# dumb-init is still recommended
ENTRYPOINT ["dumb-init", "--", "/nakama/start.sh"]