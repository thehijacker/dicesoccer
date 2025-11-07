# Dice Soccer WebSocket Server - Dockerfile
FROM node:18-alpine

LABEL org.opencontainers.image.title="Dice Soccer WebSocket Server"
LABEL org.opencontainers.image.description="Real-time multiplayer WebSocket server for Dice Soccer"
LABEL org.opencontainers.image.source="https://github.com/thehijacker/dicesoccer"

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7860', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER node

CMD ["node", "server.js"]
