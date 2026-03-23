FROM node:18-alpine AS builder

WORKDIR /backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.16.0

# Copy the custom game logic into the Nakama runtime module directory
COPY --from=builder /backend/build/*.js /nakama/data/modules/
COPY infrastructure/nakama-config.yml /nakama/data/

# Start wrapper
COPY start.sh /nakama/
RUN chmod +x /nakama/start.sh

# Expose the API port for Render to detect and map correctly
EXPOSE 7350
ENTRYPOINT ["/bin/sh", "/nakama/start.sh"]