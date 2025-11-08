# Dice Soccer WebSocket Server - Dockerfile
FROM node:18-alpine

LABEL org.opencontainers.image.title="Dice Soccer WebSocket Server"
LABEL org.opencontainers.image.description="Real-time multiplayer WebSocket server for Dice Soccer with authentication"
LABEL org.opencontainers.image.source="https://github.com/thehijacker/dicesoccer"

WORKDIR /app

# Install Python and build tools for bcrypt (native module)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (including bcrypt, better-sqlite3)
RUN npm install --omit=dev && npm cache clean --force

# Copy application files
COPY server.js ./
COPY auth-manager.js ./
COPY stats-manager.js ./
COPY database/ ./database/

# Create directories for data persistence
RUN mkdir -p /app/data /app/backups && \
    chown -R node:node /app

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7860', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER node

CMD ["node", "server.js"]
