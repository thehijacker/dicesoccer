# Dice Soccer WebSocket Server - Dockerfile
FROM node:18-alpine

LABEL org.opencontainers.image.title="Dice Soccer WebSocket Server"
LABEL org.opencontainers.image.description="Real-time multiplayer WebSocket server for Dice Soccer"
LABEL org.opencontainers.image.source="https://github.com/thehijacker/dicesoccer"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server code
COPY server.js ./

# Expose WebSocket port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run as non-root user
USER node

# Start server
CMD ["node", "server.js"]
